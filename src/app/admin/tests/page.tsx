'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SUPPORTED_EXAMS,
  EXAM_CATEGORIES,
  GENERATED_DIFFICULTIES,
} from '@/types/generated-test';
import type { GeneratedTest, GenerateTestInput, GeneratedDifficulty, SupportedExam } from '@/types/generated-test';

const DEFAULT_FORM: GenerateTestInput = {
  exam: 'BPSC TRE 4',
  category: 'History',
  topic: '',
  difficulty: 'Beginner',
  totalQuestions: 25,
  durationMinutes: 15,
  plannedPublishAt: '',
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
  const [tests, setTests] = useState<GeneratedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

      const data = await res.json() as { testId?: string; error?: string; details?: unknown };

      if (!res.ok || !data.testId) {
        setGenError(data.error ?? 'Generation failed. Please try again.');
        return;
      }

      // Navigate to preview on success
      router.push(`/admin/tests/${data.testId}`);
    } catch {
      setGenError('Network error. Please try again.');
    } finally {
      setGenerating(false);
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
        <h2 className="text-lg font-bold text-slate-900 mb-6">Generate Test Paper</h2>

        <form onSubmit={(e) => { void handleGenerate(e); }} className="space-y-5">
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

          {genError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {genError}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={generating}
              className="btn-primary px-8 py-3 text-base font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Generating question paper...
                </span>
              ) : (
                'Generate Test Paper'
              )}
            </button>
            {generating && (
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
