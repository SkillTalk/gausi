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

export default function AdminSubjectTestsPage() {
  const router = useRouter();

  // ─── Form state ────────────────────────────────────────────────────────────
  const [subject, setSubject] = useState(tre4SubjectSeries[0]?.category ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [totalQuestions, setTotalQuestions] = useState(25);
  const [durationMinutes, setDurationMinutes] = useState(15);

  // Computed test number for this subject
  const [tests, setTests] = useState<GeneratedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  // Auto-calculate next test number for selected subject
  const nextTestNumber = tests.filter((t) => t.category === subject && t.status !== 'ARCHIVED').length + 1;
  const autoTopic = `${subject} — Test ${nextTestNumber}`;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (generating) return;
    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch('/api/admin/subject-tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam: 'BPSC TRE 4',
          category: subject,
          topic: autoTopic,
          difficulty,
          totalQuestions,
          durationMinutes,
        }),
      });

      let data: { testId?: string; error?: string } = {};
      try {
        data = await res.json() as typeof data;
      } catch {
        setGenError(`Server error (HTTP ${res.status}). Check Vercel logs.`);
        return;
      }

      if (!res.ok || !data.testId) {
        setGenError(data.error ?? 'Generation failed. Please try again.');
        return;
      }

      router.push(`/admin/tests/${data.testId}`);
    } catch {
      setGenError('Request failed. Check your connection.');
    } finally {
      setGenerating(false);
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

          {/* Questions + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Number of Questions <span className="text-slate-400 font-normal">(1–50)</span>
              </label>
              <input
                type="number"
                min={1}
                max={50}
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

          {genError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {genError}
            </div>
          )}

          <button
            type="submit"
            disabled={generating}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {generating ? '⏳ Generating… (this may take 60–90 seconds)' : `✨ Generate ${autoTopic}`}
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
