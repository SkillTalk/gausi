'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRevisionList, removeFromRevision } from '@/lib/exam/revision';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';
import type { RevisionQuestion, Lang, OptionKey } from '@/types/exam';

export default function RevisionPage() {
  const [items, setItems] = useState<RevisionQuestion[]>([]);
  const [lang, setLang] = useState<Lang>('hi');

  useEffect(() => {
    setItems(getRevisionList());
  }, []);

  const handleRemove = (id: string, testId: string) => {
    removeFromRevision(id, testId);
    setItems(getRevisionList());
  };

  const reasonLabel: Record<RevisionQuestion['reason'], string> = {
    wrong: 'Wrong Answer',
    optionE: 'Skipped (E)',
    manual: 'Manually saved',
  };

  return (
    <div className="min-h-screen bg-exam-bg">
      <div className="container py-10 md:py-14 max-w-2xl mx-auto">
        <Link href="/tre4" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
          ← BPSC TRE 4
        </Link>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Revision List</h1>
          <div className="flex gap-2">
            {(['hi', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  lang === l
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {l === 'hi' ? 'हिंदी' : 'English'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-6">Saved questions from your test results.</p>

        {items.length === 0 && (
          <div className="card p-10 text-center text-slate-400">
            No saved questions yet. After finishing a test, use{' '}
            <strong>Save for Revision</strong> on wrong answers.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const test = tre4TestsBySlug[item.testId.replace('tre4-', '').replace(/^tre4-/, '')]
              ?? Object.values(tre4TestsBySlug).find((t) => t.id === item.testId);
            const question = test?.questions.find((q) => q.id === item.id);
            if (!question) return null;
            const t = question[lang];

            return (
              <div key={`${item.id}-${item.testId}`} className="card p-5 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    item.reason === 'wrong'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {reasonLabel[item.reason]}
                  </span>
                  <button
                    onClick={() => handleRemove(item.id, item.testId)}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>

                {/* Question */}
                <p className="text-slate-900 font-medium leading-relaxed" style={{ fontSize: 16, lineHeight: 1.7 }}>
                  {t.question}
                </p>

                {/* Answers */}
                <div className="flex flex-col gap-1.5 text-sm">
                  {item.selectedOption && item.selectedOption !== item.correctOption && (
                    <div className="bg-red-50 text-red-800 rounded-lg px-3 py-2">
                      <span className="font-bold">Your answer:</span>{' '}
                      {item.selectedOption}. {t.options[item.selectedOption as OptionKey]}
                    </div>
                  )}
                  <div className="bg-green-50 text-green-800 rounded-lg px-3 py-2">
                    <span className="font-bold">Correct:</span>{' '}
                    {item.correctOption}. {t.options[item.correctOption]}
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-3 py-2">
                  {t.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
