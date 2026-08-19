'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';
import { formatTimeHuman } from '@/lib/exam/scoring';
import { TopicBreakdown } from '@/components/exam/TopicBreakdown';
import { LanguageSelector } from '@/components/exam/LanguageSelector';
import type {
  DbAttempt,
  AnswerSnapshot,
  CategoryResult,
  Lang,
  OptionKey,
  Question,
} from '@/types/exam';

type PageProps = { params: { attemptId: string } };

type FetchState = 'loading' | 'done' | 'error' | 'not-found';

// ─── Display components for historical answers ─────────────────────────────────

function HistoricalAnswerCard({
  snapshot,
  question,
  lang,
}: {
  snapshot: AnswerSnapshot;
  question: Question | undefined;
  lang: Lang;
}) {
  const statusLabel: Record<AnswerSnapshot['status'], string> = {
    correct: 'Correct',
    wrong: 'Wrong Answer',
    optionE: 'Skipped (Option E)',
    unanswered: 'Not Answered',
  };
  const statusColour: Record<AnswerSnapshot['status'], string> = {
    correct: 'bg-green-50 border-green-200',
    wrong: 'bg-red-50 border-red-200',
    optionE: 'bg-amber-50 border-amber-200',
    unanswered: 'bg-slate-50 border-slate-200',
  };

  if (snapshot.status === 'correct') return null; // only show non-correct

  return (
    <div className={`rounded-2xl border p-5 space-y-3 ${statusColour[snapshot.status]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {question?.category ?? snapshot.questionId}
        </span>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            snapshot.status === 'wrong'
              ? 'bg-red-100 text-red-700'
              : snapshot.status === 'optionE'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {statusLabel[snapshot.status]}
        </span>
      </div>

      {question ? (
        <p className="text-slate-900 font-medium leading-relaxed" style={{ lineHeight: 1.7 }}>
          {question[lang].question}
        </p>
      ) : (
        <p className="text-slate-400 italic text-sm">
          Question definition no longer available (ID: {snapshot.questionId})
        </p>
      )}

      <div className="grid gap-2 text-sm">
        {snapshot.selectedOption && snapshot.selectedOption !== snapshot.correctOption && (
          <div className="flex items-start gap-2 bg-red-100 text-red-800 rounded-lg px-3 py-2">
            <span className="font-bold shrink-0">Your answer:</span>
            <span>
              {snapshot.selectedOption}.{' '}
              {question ? question[lang].options[snapshot.selectedOption as OptionKey] : snapshot.selectedOption}
            </span>
          </div>
        )}
        <div className="flex items-start gap-2 bg-green-100 text-green-800 rounded-lg px-3 py-2">
          <span className="font-bold shrink-0">Correct answer:</span>
          <span>
            {snapshot.correctOption}.{' '}
            {question ? question[lang].options[snapshot.correctOption] : snapshot.correctOption}
          </span>
        </div>
      </div>

      {question && (
        <div className="bg-white/70 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed border border-slate-100">
          <span className="font-semibold text-slate-900">Explanation: </span>
          {question[lang].explanation}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoricalResultPage({ params }: PageProps) {
  const { attemptId } = params;
  const [attempt, setAttempt] = useState<DbAttempt | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [lang, setLang] = useState<Lang>('hi');
  const [showWrong, setShowWrong] = useState(false);

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}`)
      .then(async (res) => {
        if (res.status === 404) { setFetchState('not-found'); return; }
        if (!res.ok) { setFetchState('error'); return; }
        const data = (await res.json()) as DbAttempt;
        setAttempt(data);
        setFetchState('done');
      })
      .catch(() => setFetchState('error'));
  }, [attemptId]);

  if (fetchState === 'loading') {
    return (
      <div className="exam-surface flex items-center justify-center min-h-screen">
        <div className="text-slate-400 text-sm animate-pulse">Loading result…</div>
      </div>
    );
  }

  if (fetchState === 'not-found') {
    return (
      <div className="exam-surface flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-600 font-semibold">Result not found.</p>
        <Link href="/tre4/history" className="btn-secondary text-sm">← Back to History</Link>
      </div>
    );
  }

  if (fetchState === 'error' || !attempt) {
    return (
      <div className="exam-surface flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-600 font-semibold">Could not load this result.</p>
        <Link href="/tre4/history" className="btn-secondary text-sm">← Back to History</Link>
      </div>
    );
  }

  // Try to find the static test definition for question text
  const test = Object.values(tre4TestsBySlug).find((t) => t.id === attempt.testId);
  const questionMap = new Map<string, Question>(
    (test?.questions ?? []).map((q) => [q.id, q])
  );

  const answers = attempt.answers as AnswerSnapshot[];
  const topicBreakdown = attempt.topicBreakdown as CategoryResult[] | null;

  const nonCorrect = answers.filter((a) => a.status !== 'correct');
  const pct = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 1000) / 10 : 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (attempt.accuracy / 100) * circumference;

  return (
    <div className="exam-surface min-h-screen">
      <div className="container py-8 md:py-12 max-w-2xl mx-auto">
        <Link href="/tre4/history" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
          ← Back to History
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">{attempt.testTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {attempt.subject ?? ''}{attempt.subject ? ' • ' : ''}
            Attempt #{attempt.attemptNumber} •{' '}
            {new Date(attempt.submittedAt).toLocaleString('en-IN')} •{' '}
            {attempt.language === 'hi' ? 'हिंदी' : 'English'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 italic">
            Stored historical result — score is fixed at submission time.
          </p>
        </div>

        {/* Score hero */}
        <div className="card p-8 text-center mb-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-2">Your Score</p>
          <div className="text-5xl font-extrabold text-slate-900">
            {attempt.score}
            <span className="text-2xl text-slate-400 font-medium"> / {attempt.maxScore}</span>
          </div>
          <p className="mt-1 text-slate-500 text-sm">{pct}% of maximum marks</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Correct', value: attempt.correct, colour: 'bg-green-50 text-green-800 border-green-200' },
            { label: 'Wrong', value: attempt.wrong, colour: 'bg-red-50 text-red-800 border-red-200' },
            { label: 'Option E', value: attempt.optionE, colour: 'bg-amber-50 text-amber-800 border-amber-200' },
            { label: 'Unanswered', value: attempt.unanswered, colour: 'bg-slate-50 text-slate-700 border-slate-200' },
            { label: 'Attempted', value: attempt.attempted, colour: 'bg-blue-50 text-blue-800 border-blue-200' },
            { label: 'Time Used', value: formatTimeHuman(attempt.timeUsedSeconds * 1000), colour: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border px-4 py-4 ${s.colour}`}>
              <div className="text-2xl font-extrabold">{s.value}</div>
              <div className="text-xs font-semibold mt-1 uppercase tracking-wide opacity-70">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Accuracy ring */}
        <div className="card p-6 flex flex-col sm:flex-row items-center gap-6 mb-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#E2E8F0" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="36" fill="none"
                stroke="#4F46E5" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-bold text-brand-700 text-lg">
              {attempt.accuracy}%
            </span>
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-lg">Accuracy</p>
            <p className="text-sm text-slate-500 mt-1">
              You answered correctly {attempt.correct} out of {attempt.attempted} attempted questions.
            </p>
          </div>
        </div>

        {/* Topic breakdown */}
        {topicBreakdown && topicBreakdown.length > 0 && (
          <div className="mb-6">
            <TopicBreakdown categoryResults={topicBreakdown} />
          </div>
        )}

        {/* Language for review */}
        <div className="card p-4 flex items-center justify-between gap-4 mb-6">
          <span className="text-sm text-slate-600 font-medium">Review language:</span>
          <LanguageSelector selected={lang} onChange={setLang} />
        </div>

        {/* Wrong answer review */}
        {nonCorrect.length > 0 && (
          <>
            <button
              onClick={() => setShowWrong((v) => !v)}
              className="btn-secondary w-full py-3 mb-4"
            >
              {showWrong ? 'Hide' : 'View'} Wrong / Skipped Answers ({nonCorrect.length})
            </button>

            {showWrong && (
              <div className="space-y-4">
                {nonCorrect.map((snap) => (
                  <HistoricalAnswerCard
                    key={snap.questionId}
                    snapshot={snap}
                    question={questionMap.get(snap.questionId)}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link href="/tre4/history" className="btn-secondary flex-1 text-center">
            ← All History
          </Link>
          {test && (
            <Link href={`/tre4/${test.slug}/instructions`} className="btn-primary flex-1 text-center">
              Retry This Test
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
