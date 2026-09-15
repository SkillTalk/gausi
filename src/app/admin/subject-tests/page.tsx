'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tre4SubjectSeries } from '@/content/exams/tre4/subjects';
import type { GeneratedTest } from '@/types/generated-test';

const SUBJECT_CATEGORIES = new Set(tre4SubjectSeries.map((s) => s.category));
const VALID_DIFFICULTIES = ['Beginner', 'Easy', 'Moderate', 'Hard', 'Very Hard', 'Mixed'] as const;
type Difficulty = typeof VALID_DIFFICULTIES[number];

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

type TestFormat = 'FULL_SUBJECT_TEST' | 'CUSTOM_PRACTICE';

export default function AdminSubjectTestsPage() {
  const router = useRouter();

  // ─── Form state ────────────────────────────────────────────────────────────
  const [subject, setSubject] = useState(tre4SubjectSeries[0]?.category ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [testFormat, setTestFormat] = useState<TestFormat>('FULL_SUBJECT_TEST');
  // CUSTOM_PRACTICE only — FULL_SUBJECT_TEST always uses 80Q/80min
  const [totalQuestions, setTotalQuestions] = useState(25);
  const [durationMinutes, setDurationMinutes] = useState(15);

  // Computed test number for this subject
  const [tests, setTests] = useState<GeneratedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tests');
      if (res.ok) {
        const data = await res.json() as { tests: GeneratedTest[] };
        // Filter to only subject-series categories
        setTests(data.tests.filter((t) => SUBJECT_CATEGORIES.has(t.category)));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { void loadTests(); }, [loadTests]);

  // Auto-calculate next test number for selected subject.
  // Only count tests that represent a successfully generated attempt — exclude
  // DRAFT and GENERATING (which represent failed or in-progress generations that
  // never completed). This prevents stale/failed records from skipping numbers.
  const NUMBERING_STATUSES = new Set(['GENERATED', 'VALIDATING', 'VALIDATION_FAILED', 'READY', 'SCHEDULED', 'PUBLISHED']);
  const nextTestNumber = tests.filter((t) => t.category === subject && NUMBERING_STATUSES.has(t.status)).length + 1;
  const autoTopic = `${subject} — Test ${nextTestNumber}`;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (generating) return;
    setGenerating(true);
    setGenError(null);
    setGenProgress(null);

    try {
      const body: Record<string, unknown> = {
        exam: 'BPSC TRE 4',
        category: subject,
        topic: autoTopic,
        difficulty,
        testFormat,
      };
      // CUSTOM_PRACTICE passes admin-chosen Q/duration; FULL enforces 80/80 server-side
      if (testFormat === 'CUSTOM_PRACTICE') {
        body.totalQuestions = totalQuestions;
        body.durationMinutes = durationMinutes;
      }

      const res = await fetch('/api/admin/subject-tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        // Non-streaming error (400/503) — still JSON
        let errMsg = `Server error (HTTP ${res.status}).`;
        try {
          const d = await res.json() as { error?: string };
          if (d.error) errMsg = d.error;
        } catch { /* ignore */ }
        setGenError(errMsg);
        return;
      }

      // ── FULL_SUBJECT_TEST returns a streaming NDJSON response.
      // CUSTOM_PRACTICE also returns the same format now for consistency,
      // but falls back gracefully if it's plain JSON.
      const contentType = res.headers.get('Content-Type') ?? '';

      if (contentType.includes('ndjson') || contentType.includes('octet-stream')) {
        // Streaming path — read chunks and update progress
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let doneTestId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Split on newlines (NDJSON — one JSON object per line)
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const msg = JSON.parse(trimmed) as Record<string, unknown>;
              if (msg.stage === 'starting') {
                setGenProgress('Starting generation… (batch 0/4)');
              } else if (msg.stage === 'batch_complete') {
                const b = msg.batch as number;
                const total = msg.totalBatches as number;
                setGenProgress(`Batch ${b}/${total} complete — ${msg.totalQuestions as number} questions generated`);
              } else if (msg.stage === 'done') {
                doneTestId = msg.testId as string;
                setGenProgress('✅ All 80 questions generated!');
              } else if (msg.stage === 'error') {
                setGenError((msg.error as string | undefined) ?? 'Generation failed. Check Vercel logs.');
              }
            } catch { /* malformed line — skip */ }
          }
        }

        if (doneTestId) {
          // Short pause so user sees the ✅ message before navigation
          await new Promise<void>((r) => setTimeout(r, 800));
          router.push(`/admin/tests/${doneTestId}`);
        }
      } else {
        // CUSTOM_PRACTICE plain-JSON fallback
        const data = await res.json() as { testId?: string; error?: string };
        if (!data.testId) {
          setGenError(data.error ?? 'Generation failed. Please try again.');
          return;
        }
        router.push(`/admin/tests/${data.testId}`);
      }
    } catch {
      setGenError('Request failed. Check your connection and try again.');
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  }

  async function handleDelete(testId: string) {
    if (deleteId === testId) {
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

  async function handlePublishDirect(testId: string) {
    if (!window.confirm('Publish without validation? The test will go live immediately.')) return;
    setPublishingId(testId);
    try {
      const res = await fetch(`/api/admin/tests/${testId}/publish-direct`, { method: 'POST' });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        await loadTests();
      } else {
        alert(data.error ?? 'Publish failed.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setPublishingId(null);
    }
  }

  // Filtered tests for the currently selected subject
  const subjectTests = tests.filter((t) => t.category === subject);

  return (
    <div className="space-y-10">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Subject-wise Tests</h1>
          <p className="text-sm text-slate-500 mt-1">Generate full subject papers — Music, English, CS, Hindi &amp; more</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/users"
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-slate-50">
            👤 User Data
          </a>
          <a href="/admin/topics"
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-slate-50">
            📋 Topics
          </a>
          <a href="/admin/tests"
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-slate-50">
            ← Topic Tests
          </a>
          <a href="/admin/automation"
            className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-brand-700">
            ⚡ Automation
          </a>
        </div>
      </div>

      {/* ─── Generate Form ───────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-5">Generate Subject Test Paper</h2>
        <form onSubmit={(e) => { void handleGenerate(e); }} className="space-y-5">

          {/* Format selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTestFormat('FULL_SUBJECT_TEST')}
                className={`px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                  testFormat === 'FULL_SUBJECT_TEST'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm text-slate-800">📋 Full Subject Test</div>
                <div className="text-xs text-slate-500 mt-0.5">80Q · 80 marks · STRICT scope</div>
              </button>
              <button
                type="button"
                onClick={() => setTestFormat('CUSTOM_PRACTICE')}
                className={`px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                  testFormat === 'CUSTOM_PRACTICE'
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm text-slate-800">🛠 Custom Practice</div>
                <div className="text-xs text-slate-500 mt-0.5">1–200Q · admin-specified</div>
              </button>
            </div>

            {testFormat === 'FULL_SUBJECT_TEST' && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Full Subject Test — BPSC TRE 4 Mains (Concerned Subject)</p>
                <p>• Exactly <strong>80 questions</strong>, 80 marks, 4 batches of 20</p>
                <p>• <strong>Recommended practice duration: 80 minutes</strong> — this is suggested practice timing, not an official separate section duration</p>
                <p>• All questions strictly from the selected subject syllabus (STRICT mode)</p>
                <p>• Generation takes <strong>3–4 minutes</strong> — do not close this tab</p>
              </div>
            )}
          </div>

          {/* Subject + Difficulty row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {tre4SubjectSeries.map((s) => (
                  <option key={s.slug} value={s.category}>
                    {s.icon} {s.label} — {s.labelHi}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {VALID_DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-generated test label */}
          <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-brand-700 mb-0.5">Auto-generated test label</p>
            <p className="text-sm font-bold text-brand-900">{autoTopic}</p>
            <p className="text-xs text-brand-500 mt-0.5">Based on {subjectTests.filter(t => t.status !== 'ARCHIVED').length} existing {subject} test(s)</p>
          </div>

          {/* FULL_SUBJECT_TEST: locked fields */}
          {testFormat === 'FULL_SUBJECT_TEST' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1.5">
                  Questions <span className="font-normal">(fixed)</span>
                </label>
                <div className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-400 cursor-not-allowed">
                  80 (server-enforced)
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1.5">
                  Recommended Duration <span className="font-normal">(fixed)</span>
                </label>
                <div className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-400 cursor-not-allowed">
                  80 minutes (practice)
                </div>
              </div>
            </div>
          )}

          {/* CUSTOM_PRACTICE: editable fields */}
          {testFormat === 'CUSTOM_PRACTICE' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Number of Questions <span className="text-slate-400 font-normal">(1–200)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>
          )}

          {genError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {genError}
            </div>
          )}

          {/* Progress display for FULL_SUBJECT_TEST streaming */}
          {generating && genProgress && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-brand-700 text-sm font-medium mb-2">
                <span className="animate-spin inline-block">⏳</span>
                {genProgress}
              </div>
              {/* Extract batch number from progress message for progress bar */}
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

          <button
            type="submit"
            disabled={generating}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {generating
              ? testFormat === 'FULL_SUBJECT_TEST'
                ? '⏳ Generating… do not close this tab'
                : '⏳ Generating…'
              : `✨ Generate ${autoTopic}`}
          </button>
        </form>
      </div>

      {/* ─── Test list for selected subject ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            {subject} Tests
            <span className="ml-2 text-sm font-normal text-slate-400">({subjectTests.length})</span>
          </h2>
          <button
            onClick={() => void loadTests()}
            className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : subjectTests.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm">No {subject} tests generated yet. Use the form above to create the first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subjectTests.map((test, idx) => (
              <div key={test.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800 text-sm truncate">{test.titleEn}</span>
                    <StatusBadge status={test.status} />
                  </div>
                  <div className="text-xs text-slate-400">
                    {test.totalQuestions}Q · {test.durationMinutes} min · {test.difficulty} · Created {formatDate(test.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/admin/tests/${test.id}`}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                  >
                    View →
                  </Link>
                  {['GENERATED', 'VALIDATION_FAILED'].includes(test.status) && (
                    <button
                      onClick={() => void handlePublishDirect(test.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border ${
                        publishingId === test.id
                          ? 'bg-amber-500 text-white border-amber-500 opacity-70'
                          : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {publishingId === test.id ? 'Publishing…' : '⚡ Publish'}
                    </button>
                  )}
                  <button
                    onClick={() => void handleDelete(test.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border ${
                      deleteId === test.id
                        ? 'bg-red-600 text-white border-red-600'
                        : 'text-red-500 border-red-200 hover:bg-red-50'
                    }`}
                  >
                    {deleteId === test.id ? 'Confirm Delete' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── All subject-series tests (collapsed view) ───────────────────── */}
      {tests.filter(t => t.category !== subject).length > 0 && (
        <div>
          <h2 className="text-base font-bold text-slate-600 mb-3">Other Subject Tests</h2>
          <div className="space-y-2">
            {tests.filter(t => t.category !== subject).map((test) => (
              <div key={test.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 text-sm truncate block">{test.titleEn}</span>
                  <span className="text-xs text-slate-400">{test.category} · {test.totalQuestions}Q · <StatusBadge status={test.status} /></span>
                </div>
                <Link
                  href={`/admin/tests/${test.id}`}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 shrink-0"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
