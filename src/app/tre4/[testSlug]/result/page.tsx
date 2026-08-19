'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';
import type { ExamResult, Lang } from '@/types/exam';
import { ResultSummary } from '@/components/exam/ResultSummary';
import { TopicBreakdown } from '@/components/exam/TopicBreakdown';
import { WrongAnswerReview } from '@/components/exam/WrongAnswerReview';
import { LanguageSelector } from '@/components/exam/LanguageSelector';

type PageProps = { params: Promise<{ testSlug: string }> };

const RESULT_KEY = 'exam-result-';

export default function ResultPage({ params }: PageProps) {
  const { testSlug } = use(params);
  const test = tre4TestsBySlug[testSlug];
  const [result, setResult] = useState<ExamResult | null>(null);
  const [lang, setLang] = useState<Lang>('hi');
  const [showReview, setShowReview] = useState(false);
  const hasAiKey = Boolean(process.env.NEXT_PUBLIC_AI_EXPLAIN_ENABLED);

  useEffect(() => {
    if (!test) return;
    try {
      const raw = localStorage.getItem(RESULT_KEY + test.id);
      if (raw) setResult(JSON.parse(raw) as ExamResult);
    } catch {
      // no result
    }
  }, [test]);

  if (!test) {
    return (
      <div className="exam-surface flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Test not found.</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="exam-surface flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Result not found. Please complete a test first.</p>
      </div>
    );
  }

  const wrongCount = result.questions.filter(
    (q) => q.status === 'wrong' || q.status === 'optionE' || q.status === 'unanswered'
  ).length;

  return (
    <div className="exam-surface min-h-screen">
      <div className="container py-8 md:py-12 max-w-2xl mx-auto">
        {/* Back */}
        <Link href="/tre4/daily" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
          ← Back to Daily Tests
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">{test.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{test.subject} • {test.date}</p>
        </div>

        {/* Result summary */}
        <ResultSummary result={result} />

        {/* Topic breakdown */}
        <div className="mt-6">
          <TopicBreakdown categoryResults={result.categoryResults} />
        </div>

        {/* Language for review */}
        <div className="mt-6 card p-4 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-600 font-medium">Review language:</span>
          <LanguageSelector selected={lang} onChange={setLang} />
        </div>

        {/* Wrong answer review toggle */}
        {wrongCount > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowReview((v) => !v)}
              className="btn-secondary w-full py-3"
            >
              {showReview ? 'Hide' : 'View'} Wrong Answers ({wrongCount})
            </button>

            {showReview && (
              <div className="mt-4">
                <WrongAnswerReview
                  result={result}
                  questions={test.questions}
                  lang={lang}
                  hasAiKey={hasAiKey}
                />
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link href={`/tre4/${testSlug}/instructions`} className="btn-primary flex-1 text-center">
            Retry Test
          </Link>
          <Link href="/tre4/revision" className="btn-secondary flex-1 text-center">
            My Revision List
          </Link>
          <Link href="/tre4/history" className="btn-ghost flex-1 text-center">
            All Attempts
          </Link>
        </div>
      </div>
    </div>
  );
}
