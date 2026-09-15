'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SUPPORTED_EXAMS,
  EXAM_CATEGORIES,
  GENERATED_DIFFICULTIES,
  TOPIC_ADHERENCE_MODES,
} from '@/types/generated-test';
import type { GeneratedTest, GenerateTestInput, GeneratedDifficulty, SupportedExam, TopicAdherenceMode } from '@/types/generated-test';

const DEFAULT_FORM: GenerateTestInput = {
  exam: 'BPSC TRE 4',
  category: 'History',
  topic: '',
  difficulty: 'Beginner',
  totalQuestions: 25,
  durationMinutes: 15,
  plannedPublishAt: '',
  strictTopicScope: '',
  excludeScope: '',
  topicAdherenceMode: 'STRICT',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    GENERATING: 'bg-amber-100 text-amber-700 animate-pulse',
    GENERATED: 'bg-green-100 text-green-700',
    VALIDATING: 'bg-purple-100 text-purple-700 animate-pulse',
    VALIDATION_FAILED: 'bg-red-100 text-red-700',
    READY: 'bg-blue-100 text-blue-700',
    SCHEDULED: 'bg-indigo-100 text-indigo-700',
    PUBLISHED: 'bg-brand-100 text-brand-700',
    ARCHIVED: 'bg-slate-100 text-slate-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${styles[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminTestsPage() {
  const router = useRouter();
  const [form, setForm] = useState<GenerateTestInput>(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<string | null>(null);
  const [tests, setTests] = useState<GeneratedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // PDF mode
  const [pdfMode, setPdfMode] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const loadTests = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tests');
      if (res.ok) {
        const data = await res.json() as { tests: GeneratedTest[] };
        setTests(data.tests);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { void loadTests(); }, [loadTests]);

  const categories = EXAM_CATEGORIES[form.exam as SupportedExam] ?? [];

  function setField<K extends keyof GenerateTestInput>(key: K, value: GenerateTestInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'exam') {
      setForm(prev => ({ ...prev, exam: value as SupportedExam, category: (EXAM_CATEGORIES[value as SupportedExam] ?? [])[0] ?? '' }));
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (generating) return;
    setGenerating(true);
    setGenError(null);
    setGenProgress(null);

    try {
      const payload: GenerateTestInput = {
        ...form,
        plannedPublishAt: form.plannedPublishAt || undefined,
      };

      const res = await fetch('/api/admin/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) {
        let errMsg = `Server error (HTTP ${res.status}). Check Vercel logs for details.`;
        try {
          const d = await res.json() as { error?: string };
          if (d.error) errMsg = d.error;
        } catch { /* ignore */ }
        setGenError(errMsg);
        return;
      }

      const contentType = res.headers.get('Content-Type') ?? '';

      if (contentType.includes('ndjson')) {
        // Streaming path for >25Q batched generation
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let doneTestId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const msg = JSON.parse(trimmed) as Record<string, unknown>;
              if (msg.stage === 'starting') {
                setGenProgress(`Starting… (0/${msg.totalBatches as number} batches)`);
              } else if (msg.stage === 'batch_complete') {
                const b = msg.batch as number;
                const total = msg.totalBatches as number;
                setGenProgress(`Batch ${b}/${total} complete — ${msg.totalQuestions as number} questions`);
              } else if (msg.stage === 'done') {
                doneTestId = msg.testId as string;
                setGenProgress('✅ Generation complete!');
              } else if (msg.stage === 'error') {
                setGenError((msg.error as string | undefined) ?? 'Generation failed. Check Vercel logs.');
              }
            } catch { /* skip malformed line */ }
          }
        }

        if (doneTestId) {
          await new Promise<void>((r) => setTimeout(r, 600));
          router.push(`/admin/tests/${doneTestId}`);
        }
      } else {
        // Plain JSON path for ≤25Q (fast, single call)
        let data: { testId?: string; error?: string } = {};
        try {
          data = await res.json() as typeof data;
        } catch {
          setGenError(`Server error (HTTP ${res.status}). Check Vercel logs for details.`);
          return;
        }
        if (!data.testId) {
          setGenError(data.error ?? 'Generation failed. Please try again.');
          return;
        }
        router.push(`/admin/tests/${data.testId}`);
      }
    } catch {
      setGenError('Request failed. Check your network connection and try again.');
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  }

  async function handleGenerateFromPdf(e: React.FormEvent) {
    e.preventDefault();
    if (generating || !pdfFile) return;
    setGenerating(true);
    setGenError(null);
    setGenProgress(null);

    try {
      const fd = new FormData();
      fd.append('pdf', pdfFile);
      fd.append('exam', form.exam ?? 'BPSC TRE 4');
      fd.append('category', form.category);
      fd.append('topic', form.topic);
      fd.append('difficulty', form.difficulty);
      fd.append('totalQuestions', String(form.totalQuestions));
      fd.append('durationMinutes', String(form.durationMinutes));

      const res = await fetch('/api/admin/tests/generate-from-pdf', { method: 'POST', body: fd });

      if (!res.ok || !res.body) {
        let errMsg = `Server error (HTTP ${res.status}).`;
        try { const d = await res.json() as { error?: string }; if (d.error) errMsg = d.error; } catch { /* ignore */ }
        setGenError(errMsg);
        return;
      }

      const contentType = res.headers.get('Content-Type') ?? '';
      if (contentType.includes('ndjson')) {
        // Streaming path (>25Q)
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let doneTestId: string | null = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const msg = JSON.parse(trimmed) as Record<string, unknown>;
              if (msg.stage === 'starting') setGenProgress(`📄 PDF पढ़ा गया — ${msg.totalBatches as number} batches शुरू…`);
              else if (msg.stage === 'batch_complete') setGenProgress(`Batch ${msg.batch as number}/${msg.totalBatches as number} — ${msg.totalQuestions as number} questions`);
              else if (msg.stage === 'done') { doneTestId = msg.testId as string; setGenProgress('✅ PDF से questions generate हुए!'); }
              else if (msg.stage === 'error') setGenError((msg.error as string | undefined) ?? 'Generation failed.');
            } catch { /* skip */ }
          }
        }
        if (doneTestId) { await new Promise<void>((r) => setTimeout(r, 600)); router.push(`/admin/tests/${doneTestId}`); }
      } else {
        // Plain JSON (≤25Q)
        const data = await res.json() as { testId?: string; error?: string };
        if (!data.testId) { setGenError(data.error ?? 'Generation failed.'); return; }
        router.push(`/admin/tests/${data.testId}`);
      }
    } catch {
      setGenError('Request failed. Check your connection.');
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  }

  async function handleDelete(testId: string) {
    if (deleteId === testId) {
      // Second click — confirmed delete
      try {
        await fetch(`/api/admin/tests/${testId}`, { method: 'DELETE' });
        setTests(prev => prev.filter(t => t.id !== testId));
      } catch { /* silent */ }
      setDeleteId(null);
    } else {
      setDeleteId(testId);
      setTimeout(() => setDeleteId(null), 4000);
    }
  }

  return (
    <div className="space-y-10">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Generated Tests</h1>
          <div className="mt-3 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Agent 1–4 Active
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/admin/users"
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-slate-50">
            👤 User Data
          </a>
          <a href="/admin/subject-tests"
            className="inline-flex items-center gap-2 border border-purple-300 text-purple-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-purple-50">
            🗂️ Subject Tests
          </a>
          <a href="/admin/topics"
            className="inline-flex items-center gap-2 border border-brand-300 text-brand-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-brand-50">
            📋 Topics
          </a>
          <a href="/admin/automation"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            ⚙ Automation
          </a>
        </div>
      </div>

      {/* ─── Generator Form ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">Generate Test Paper</h2>
          {/* Mode toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold">
            <button
              type="button"
              onClick={() => { setPdfMode(false); setPdfFile(null); }}
              className={`px-4 py-2 transition-colors ${!pdfMode ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              ✨ AI Generate
            </button>
            <button
              type="button"
              onClick={() => setPdfMode(true)}
              className={`px-4 py-2 transition-colors ${pdfMode ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              📄 From PDF
            </button>
          </div>
        </div>

        <form onSubmit={(e) => { pdfMode ? void handleGenerateFromPdf(e) : void handleGenerate(e); }} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Exam */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam</label>
              <select
                value={form.exam}
                onChange={e => setField('exam', e.target.value as SupportedExam)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SUPPORTED_EXAMS.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setField('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Topic</label>
              <input
                type="text"
                value={form.topic}
                onChange={e => setField('topic', e.target.value)}
                placeholder="e.g. Revolt of 1857, Indian Rivers, Photosynthesis"
                required
                maxLength={200}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* ── Scope Boundary (Aug 2026) ──────────────────────────── */}
            {/* Topic Adherence Mode */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Topic Adherence Mode
                <span className="ml-2 font-normal text-slate-400 text-xs">STRICT = out-of-scope questions will FAIL validation</span>
              </label>
              <div className="flex gap-3">
                {TOPIC_ADHERENCE_MODES.map(mode => (
                  <label key={mode} className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${form.topicAdherenceMode === mode ? 'bg-brand-50 border-brand-400 text-brand-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="topicAdherenceMode"
                      value={mode}
                      checked={form.topicAdherenceMode === mode}
                      onChange={() => setField('topicAdherenceMode', mode as TopicAdherenceMode)}
                      className="sr-only"
                    />
                    {mode}
                    {mode === 'STRICT' && <span className="text-amber-600">⚠</span>}
                  </label>
                ))}
              </div>
            </div>

            {/* Strict Topic Scope */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Strict Topic Scope
                <span className="ml-2 font-normal text-slate-400 text-xs">What this topic covers — Agent 1 and Agent 2 will enforce this</span>
              </label>
              <textarea
                value={form.strictTopicScope ?? ''}
                onChange={e => setField('strictTopicScope', e.target.value)}
                placeholder="e.g. Questions must test the Indian National Congress as an organisation between 1885 and 1948, including its foundation, sessions, presidents, resolutions..."
                rows={3}
                maxLength={2000}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">{(form.strictTopicScope ?? '').length}/2000</p>
            </div>

            {/* Exclude Scope */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Exclude / Out of Scope
                <span className="ml-2 font-normal text-slate-400 text-xs">Optional — what Agent 1 must NOT generate</span>
              </label>
              <textarea
                value={form.excludeScope ?? ''}
                onChange={e => setField('excludeScope', e.target.value)}
                placeholder="e.g. Do not generate general Modern Indian History questions unless they directly test an INC decision, session, resolution or president."
                rows={2}
                maxLength={1000}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">{(form.excludeScope ?? '').length}/1000</p>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={e => setField('difficulty', e.target.value as GeneratedDifficulty)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {GENERATED_DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Questions */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Number of Questions <span className="font-normal text-slate-400 text-xs">(5–50)</span>
              </label>
              <input
                type="number"
                value={form.totalQuestions}
                min={5} max={50}
                onChange={e => setField('totalQuestions', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (minutes)</label>
              <input
                type="number"
                value={form.durationMinutes}
                min={5} max={180}
                onChange={e => setField('durationMinutes', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Language (display only) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Language</label>
              <div className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500 bg-slate-50">
                Hindi + English (bilingual)
              </div>
            </div>

            {/* Planned Publish Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Planned Publish Date <span className="font-normal text-slate-400 text-xs">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.plannedPublishAt ?? ''}
                onChange={e => setField('plannedPublishAt', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* PDF upload — shown only in PDF mode */}
          {pdfMode && (
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-5">
              <label className="block text-sm font-semibold text-amber-800 mb-2">
                📄 Upload PDF
              </label>
              <p className="text-xs text-amber-700 mb-3">
                Questions will be generated <strong>strictly from the PDF content</strong>. Use a text-based PDF (not a scanned image).
              </p>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
              />
              {pdfFile && (
                <p className="text-xs text-amber-700 mt-2">✅ {pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)</p>
              )}
            </div>
          )}

          {genError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {genError}
            </div>
          )}

          {/* Progress bar for multi-batch generation (>25Q) */}
          {generating && genProgress && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-brand-700 text-sm font-medium mb-2">
                <span className="animate-spin inline-block">⏳</span>
                {genProgress}
              </div>
              {(() => {
                const match = genProgress.match(/Batch (\d+)\/(\d+)/);
                const current = match ? parseInt(match[1]) : genProgress.includes('✅') ? 4 : 0;
                const total = match ? parseInt(match[2]) : 4;
                const pct = Math.round((current / total) * 100);
                return (
                  <div className="w-full bg-brand-200 rounded-full h-2">
                    <div
                      className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={generating || (pdfMode && !pdfFile)}
              className={`px-8 py-3 text-base font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-white ${pdfMode ? 'bg-amber-500 hover:bg-amber-600' : 'btn-primary'}`}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {genProgress ? 'Generating… do not close this tab' : 'Generating from PDF...'}
                </span>
              ) : pdfMode ? (
                pdfFile ? '📄 Generate from PDF' : '📄 Upload a PDF first'
              ) : (
                'Generate Test Paper'
              )}
            </button>
            {generating && !genProgress && (
              <p className="text-sm text-slate-500">This may take 15–45 seconds.</p>
            )}
          </div>
        </form>
      </section>

      {/* ─── Agent Status Panel ───────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Agent Pipeline Status</p>
        <div className="flex flex-wrap gap-6 text-sm">
          <span className="text-green-700">✅ Agent 1: Question Generator</span>
          <span className="text-green-700">✅ Agent 2: Validator / Reviewer</span>
          <span className="text-green-700">✅ Agent 3: Publish &amp; Scheduling</span>
        </div>
      </section>

      {/* ─── Generated Tests List ────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Generated Tests</h2>

        {loading ? (
          <div className="text-sm text-slate-400 py-6 text-center">Loading...</div>
        ) : tests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center text-slate-400 text-sm">
            No tests generated yet. Use the form above to generate your first test.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Topic / Category</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Difficulty</th>
                  <th className="px-4 py-3 hidden md:table-cell">Questions</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Published / Scheduled</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Created</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(test => {
                  const t = test as GeneratedTest & { publishAt?: string | null; publishedAt?: string | null };
                  const pubDisplay = t.publishedAt
                    ? formatDate(t.publishedAt)
                    : t.publishAt
                    ? `Sched: ${formatDate(t.publishAt)}`
                    : '—';
                  return (
                  <tr key={test.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]">{test.topic}</div>
                      <div className="text-xs text-slate-400">{test.category}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-600">{test.difficulty}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{test.totalQuestions}Q · {test.durationMinutes}min</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{pubDisplay}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs">{formatDate(test.createdAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={test.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/tests/${test.id}`}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                        >
                          View
                        </Link>
                        {test.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => { void handleDelete(test.id); }}
                            className={`text-xs font-semibold transition-colors ${
                              deleteId === test.id
                                ? 'text-white bg-red-600 px-2 py-0.5 rounded'
                                : 'text-red-500 hover:text-red-700'
                            }`}
                          >
                            {deleteId === test.id ? 'Confirm' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
