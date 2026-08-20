'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import type { GeneratedTestWithQuestions, GeneratedQuestion } from '@/types/generated-test';

type Params = Promise<{ testId: string }>;

function OptionRow({ letter, hi, en, isCorrect }: { letter: string; hi: string; en: string; isCorrect: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-2 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : ''}`}>
      <span className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border ${
        isCorrect ? 'bg-green-600 text-white border-green-600' : 'border-slate-300 text-slate-500'
      }`}>
        {letter}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-800">{hi}</div>
        <div className="text-xs text-slate-500 mt-0.5">{en}</div>
      </div>
      {isCorrect && <span className="text-xs font-bold text-green-700 shrink-0">✓ Correct</span>}
    </div>
  );
}

function QuestionCard({ q, index }: { q: GeneratedQuestion; index: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 h-7 w-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-extrabold">
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800 leading-relaxed">{q.questionHi}</div>
          <div className="text-xs text-slate-500 mt-1 leading-relaxed">{q.questionEn}</div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{q.category}</span>
          <span className="text-xs text-slate-400">{q.difficulty}</span>
        </div>
      </div>

      <div className="space-y-1.5 pl-10">
        <OptionRow letter="A" hi={q.optionAHi} en={q.optionAEn} isCorrect={q.correctOption === 'A'} />
        <OptionRow letter="B" hi={q.optionBHi} en={q.optionBEn} isCorrect={q.correctOption === 'B'} />
        <OptionRow letter="C" hi={q.optionCHi} en={q.optionCEn} isCorrect={q.correctOption === 'C'} />
        <OptionRow letter="D" hi={q.optionDHi} en={q.optionDEn} isCorrect={q.correctOption === 'D'} />
        <OptionRow letter="E" hi={q.optionEHi} en={q.optionEEn} isCorrect={false} />
      </div>

      <div className="pl-10 pt-1 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 mb-0.5">Explanation</p>
        <p className="text-sm text-slate-700">{q.explanationHi}</p>
        <p className="text-xs text-slate-500 mt-0.5">{q.explanationEn}</p>
      </div>
    </div>
  );
}

export default function AdminTestPreviewPage({ params }: { params: Params }) {
  const { testId } = use(params);
  const router = useRouter();
  const [test, setTest] = useState<GeneratedTestWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/tests/${testId}`)
      .then(r => r.json())
      .then((d: { test?: GeneratedTestWithQuestions; error?: string }) => {
        if (d.test) setTest(d.test);
        else setError(d.error ?? 'Not found.');
      })
      .catch(() => setError('Failed to load test.'))
      .finally(() => setLoading(false));
  }, [testId]);

  async function handleDelete() {
    if (!confirmRegen) {
      if (!window.confirm('Delete this test and all its questions? This cannot be undone.')) return;
    }
    setDeleting(true);
    await fetch(`/api/admin/tests/${testId}`, { method: 'DELETE' });
    router.push('/admin/tests');
  }

  async function handleRegenerate() {
    if (!window.confirm(`Regenerate all ${test?.totalQuestions} questions? Current questions will be replaced.`)) return;
    setRegenerating(true);
    const res = await fetch(`/api/admin/tests/${testId}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    const data = await res.json() as { status?: string; error?: string };
    if (res.ok) {
      // Reload the test
      const testRes = await fetch(`/api/admin/tests/${testId}`);
      const testData = await testRes.json() as { test: GeneratedTestWithQuestions };
      if (testData.test) setTest(testData.test);
    } else {
      alert(data.error ?? 'Regeneration failed.');
    }
    setRegenerating(false);
    setConfirmRegen(false);
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading test preview...</div>;
  }
  if (error || !test) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error ?? 'Test not found.'}</p>
        <a href="/admin/tests" className="text-brand-600 hover:underline text-sm">← Back to Tests</a>
      </div>
    );
  }

  const planDate = test.plannedPublishAt
    ? new Date(test.plannedPublishAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not set';

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <a href="/admin/tests" className="hover:text-brand-600">Tests</a>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate">{test.topic}</span>
      </div>

      {/* Test Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                test.status === 'GENERATED' ? 'bg-green-100 text-green-700' :
                test.status === 'GENERATING' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-500'
              }`}>{test.status}</span>
              <span className="text-xs text-slate-400">{test.exam}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">{test.titleEn}</h1>
            <p className="text-slate-500 mt-0.5">{test.titleHi}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { void handleRegenerate(); }}
              disabled={regenerating || test.status === 'GENERATING'}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
            >
              {regenerating ? 'Regenerating...' : '↺ Regenerate'}
            </button>
            <button
              onClick={() => { void handleDelete(); }}
              disabled={deleting}
              className="text-sm font-semibold text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Category', value: test.category },
            { label: 'Difficulty', value: test.difficulty },
            { label: 'Questions', value: `${test.totalQuestions}Q · ${test.durationMinutes}min` },
            { label: 'Planned Publish', value: planDate },
          ].map(item => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 font-medium mb-0.5">{item.label}</div>
              <div className="text-sm font-semibold text-slate-800">{item.value}</div>
            </div>
          ))}
        </div>

        {test.generationModel && (
          <p className="mt-4 text-xs text-slate-400">
            Generated by {test.generationModel}
            {test.generationMs && ` · ${(test.generationMs / 1000).toFixed(1)}s`}
          </p>
        )}
      </div>

      {/* Questions */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Questions ({test.questions.length})
        </h2>
        <div className="space-y-4">
          {test.questions.map((q, i) => (
            <QuestionCard key={q.id} q={q} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
