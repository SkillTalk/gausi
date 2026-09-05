'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTest } from '@/hooks/useTest';
import type { ExamResult, Lang, PendingSubmission } from '@/types/exam';
import { ResultSummary } from '@/components/exam/ResultSummary';
import { TopicBreakdown } from '@/components/exam/TopicBreakdown';
import { WrongAnswerReview } from '@/components/exam/WrongAnswerReview';
import { LanguageSelector } from '@/components/exam/LanguageSelector';
import { loadPendingAttempt, clearPendingAttempt } from '@/lib/exam/pending-attempt';

type PageProps = { params: { testSlug: string } };

const RESULT_KEY = 'exam-result-';

type SaveStatus = 'saving' | 'saved' | 'failed' | 'no-identity';

type AttemptSaveResult = { id: string; attemptNumber: number };

async function postAttempt(pending: PendingSubmission): Promise<AttemptSaveResult | null> {
  try {
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: pending.userId,
        testId: pending.testId,
        testSlug: pending.testSlug,
        language: pending.language,
        startedAt: new Date(pending.startedAt).toISOString(),
        submittedAt: new Date(pending.submittedAt).toISOString(),
        submissionReason: pending.submissionReason,
        answers: pending.answers,
        idempotencyKey: pending.idempotencyKey,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id: string; attemptNumber?: number };
    if (!data.id) return null;
    return { id: data.id, attemptNumber: data.attemptNumber ?? 1 };
  } catch {
    return null;
  }
}

export default function ResultPage({ params }: PageProps) {
  const { testSlug } = params;
  const { test, loading: testLoading } = useTest(testSlug);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [lang, setLang] = useState<Lang>('hi');
  const [showReview, setShowReview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<PendingSubmission | null>(null);
  const hasAiKey = Boolean(process.env.NEXT_PUBLIC_AI_EXPLAIN_ENABLED);

  useEffect(() => {
    if (!test) return;
    try {
      const raw = localStorage.getItem(RESULT_KEY + test.id);
      if (raw) setResult(JSON.parse(raw) as ExamResult);
    } catch {
      // no result
    }

    const pending = loadPendingAttempt();
    setPendingAttempt(pending);

    if (!pending) {
      setSaveStatus('no-identity');
      return;
    }

    setSaveStatus('saving');
    postAttempt(pending).then((saved) => {
      if (saved) {
        setAttemptId(saved.id);
        setAttemptNumber(saved.attemptNumber);
        setSaveStatus('saved');
        clearPendingAttempt();
      } else {
        setSaveStatus('failed');
      }
    });
  }, [test]);

  const handleRetrySave = useCallback(async () => {
    if (!pendingAttempt) return;
    setSaveStatus('saving');
    const saved = await postAttempt(pendingAttempt);
    if (saved) {
      setAttemptId(saved.id);
      setAttemptNumber(saved.attemptNumber);
      setSaveStatus('saved');
      clearPendingAttempt();
    } else {
      setSaveStatus('failed');
    }
  }, [pendingAttempt]);

  if (testLoading) {
    return (
      <div className="exam-surface flex items-center justify-center min-h-screen">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

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
        <Link href="/tre4/daily" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
          ← Back to Daily Tests
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">{test.title}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-slate-500">{test.subject} • {test.date}</p>
            {attemptNumber !== null && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                #{attemptNumber} Attempt
              </span>
            )}
          </div>
        </div>

        {/* DB save status banner */}
        {saveStatus === 'saving' && (
          <div className="mb-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
            <span className="animate-pulse">●</span> Saving result to your history…
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="mb-4 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700 flex items-center justify-between gap-2">
            <span>✓ Result saved to your history.</span>
            {attemptId && (
              <Link href={`/tre4/history/${attemptId}`} className="underline font-semibold whitespace-nowrap">
                View in History →
              </Link>
            )}
          </div>
        )}
        {saveStatus === 'failed' && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-2">
            <span>Result not saved yet — network error.</span>
            <button onClick={handleRetrySave} className="underline font-semibold whitespace-nowrap">
              Retry Save
            </button>
          </div>
        )}

        <ResultSummary result={result} />

        <div className="mt-6">
          <TopicBreakdown categoryResults={result.categoryResults} />
        </div>

        <div className="mt-6 card p-4 flex items-center justify-between gap-4">
          <span className="text-sm text-slate-600 font-medium">Review language:</span>
          <LanguageSelector selected={lang} onChange={setLang} />
        </div>

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
