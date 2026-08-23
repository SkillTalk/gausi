'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTest } from '@/hooks/useTest';
import {
  loadSession,
  saveSession,
  setAnswer,
  clearAnswer,
  toggleMarkForReview,
  setCurrentQuestion,
  markVisited,
  setLanguage,
  submitSession,
} from '@/lib/exam/session';
import { calculateResult } from '@/lib/exam/scoring';
import { isExpired } from '@/lib/exam/timer';
import { addAttempt } from '@/lib/exam/history';
import {
  savePendingAttempt,
  clearPendingAttempt,
  generateIdempotencyKey,
} from '@/lib/exam/pending-attempt';
import { readIdentity } from '@/lib/exam/identity-storage';
import type { ExamSession, Lang, OptionKey, PendingSubmission } from '@/types/exam';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { QuestionPalette } from '@/components/exam/QuestionPalette';
import { ExamHeader } from '@/components/exam/ExamHeader';
import { ExamNavBar } from '@/components/exam/ExamNavBar';
import { SubmitConfirmModal } from '@/components/exam/SubmitConfirmModal';

type PageProps = { params: { testSlug: string } };

const RESULT_KEY = 'exam-result-';

export default function TestPage({ params }: PageProps) {
  const { testSlug } = params;
  const router = useRouter();
  const { test, loading: testLoading } = useTest(testSlug);

  const [session, setSession] = useState<ExamSession | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const autoSubmitFired = useRef(false);

  useEffect(() => {
    if (testLoading || !test) return;
    const existing = loadSession(test.id);
    if (!existing || existing.submitted) {
      router.replace(`/tre4/${testSlug}/instructions`);
      return;
    }
    if (isExpired(existing.expiresAt)) {
      handleAutoSubmit(existing);
      return;
    }
    setSession(existing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, testSlug]);

  const updateSession = useCallback((updater: (s: ExamSession) => ExamSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveSession(next);
      return next;
    });
  }, []);

  /** Build a PendingSubmission from a submitted session and store it before routing. */
  const buildAndStorePending = useCallback(
    (submitted: ExamSession, reason: 'manual' | 'timeout'): void => {
      if (!test) return;
      const identity = readIdentity();
      if (!identity) return; // guest — no server save

      const pending: PendingSubmission = {
        idempotencyKey: generateIdempotencyKey(),
        userId: identity.userId,
        testId: test.id,
        testSlug: test.slug,
        testTitle: test.title,
        subject: test.subject ?? null,
        topic: test.topicId ?? null,
        language: submitted.language,
        startedAt: submitted.startedAt,
        submittedAt: submitted.submittedAt ?? Date.now(),
        submissionReason: reason,
        timeUsedSeconds: Math.round(
          Math.min(
            (submitted.submittedAt ?? Date.now()) - submitted.startedAt,
            test.config.durationMinutes * 60 * 1000
          ) / 1000
        ),
        answers: submitted.answers as Record<string, OptionKey>,
      };
      savePendingAttempt(pending);
    },
    [test]
  );

  const handleAutoSubmit = useCallback(
    (s: ExamSession) => {
      if (autoSubmitFired.current) return;
      autoSubmitFired.current = true;
      const submitted = submitSession(s);
      saveSession(submitted);
      if (test) {
        const result = calculateResult(test, submitted);
        localStorage.setItem(RESULT_KEY + test.id, JSON.stringify(result));
        addAttempt(test, result);
        buildAndStorePending(submitted, 'timeout');
      }
      router.replace(`/tre4/${testSlug}/result`);
    },
    [test, testSlug, router, buildAndStorePending]
  );

  const handleTimerExpire = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      handleAutoSubmit(prev);
      return prev;
    });
  }, [handleAutoSubmit]);

  const handleSelectOption = (option: OptionKey) => {
    if (!test) return;
    updateSession((s) => {
      const q = test.questions[s.currentQuestion];
      if (!q) return s;
      return setAnswer(s, q.id, option);
    });
  };

  const handleClearResponse = () => {
    if (!test) return;
    updateSession((s) => {
      const q = test.questions[s.currentQuestion];
      if (!q) return s;
      return clearAnswer(s, q.id);
    });
  };

  const handleMarkReview = () => {
    if (!test) return;
    updateSession((s) => {
      const q = test.questions[s.currentQuestion];
      if (!q) return s;
      return toggleMarkForReview(s, q.id);
    });
  };

  const navigateTo = (index: number) => {
    if (!test) return;
    updateSession((s) => {
      const q = test.questions[index];
      if (!q) return s;
      return markVisited(setCurrentQuestion(s, index), q.id);
    });
    setShowPalette(false);
    // On mobile, scroll back to the top of the page so the question is
    // visible immediately without requiring manual upward scrolling.
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (!session || !test) return;
    const next = session.currentQuestion + 1;
    if (next < test.questions.length) navigateTo(next);
  };

  const handlePrev = () => {
    if (!session) return;
    const prev = session.currentQuestion - 1;
    if (prev >= 0) navigateTo(prev);
  };

  const handleLangChange = (lang: Lang) => {
    updateSession((s) => setLanguage(s, lang));
  };

  const handleFinalSubmit = () => {
    if (!session || !test) return;
    const submitted = submitSession(session);
    saveSession(submitted);
    const result = calculateResult(test, submitted);
    localStorage.setItem(RESULT_KEY + test.id, JSON.stringify(result));
    addAttempt(test, result);

    // Clear any old pending attempt before storing the new one
    clearPendingAttempt();
    buildAndStorePending(submitted, 'manual');

    router.push(`/tre4/${testSlug}/result`);
  };

  if (testLoading) {
    return (
      <div className="exam-surface flex items-center justify-center min-h-screen">
        <div className="text-slate-400 text-sm">Loading test…</div>
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

  if (!session) {
    return (
      <div className="exam-surface flex items-center justify-center min-h-screen">
        <div className="text-slate-400 text-sm">Loading session…</div>
      </div>
    );
  }

  const currentQ = test.questions[session.currentQuestion];
  const isFirst = session.currentQuestion === 0;
  const isLast = session.currentQuestion === test.questions.length - 1;
  const isMarked = session.markedForReview[currentQ?.id ?? ''] ?? false;
  const isAnswered = session.answers[currentQ?.id ?? ''] !== undefined;

  return (
    <div className="exam-surface">
      <ExamHeader
        examName={test.config.examName}
        questionIndex={session.currentQuestion}
        totalQuestions={test.questions.length}
        lang={session.language}
        expiresAt={session.expiresAt}
        onExpire={handleTimerExpire}
        onLangChange={handleLangChange}
        onSubmitClick={() => setShowSubmit(true)}
      />

      <div className="container py-3 sm:py-4 md:py-6">
        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0">
            {currentQ && (
              <>
                <QuestionCard
                  question={currentQ}
                  index={session.currentQuestion}
                  total={test.questions.length}
                  lang={session.language}
                  selectedOption={session.answers[currentQ.id] as OptionKey | undefined}
                  onSelect={handleSelectOption}
                />

                {/* Desktop/tablet nav — hidden on mobile, replaced by sticky bottom bar */}
                <div className="hidden sm:block mt-4">
                  <ExamNavBar
                    isFirst={isFirst}
                    isLast={isLast}
                    isAnswered={isAnswered}
                    isMarked={isMarked}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onClear={handleClearResponse}
                    onMarkReview={handleMarkReview}
                    onSubmit={() => setShowSubmit(true)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Desktop sidebar palette — lg+ only */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-20">
            <div className="card p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Question Palette
              </h3>
              <QuestionPalette
                questions={test.questions}
                session={session}
                currentIndex={session.currentQuestion}
                onNavigate={navigateTo}
              />
            </div>
          </aside>
        </div>

        {/* Tablet bottom bar (sm → lg): palette toggle + submit — unchanged behaviour */}
        <div className="hidden sm:block lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200">
          <div className="container py-2 flex items-center justify-between gap-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
            <button
              onClick={() => setShowPalette((p) => !p)}
              className="btn-secondary text-xs py-2 flex-1"
            >
              {showPalette ? 'Hide' : 'Questions'} Palette
            </button>
            <button onClick={() => setShowSubmit(true)} className="btn-danger text-xs py-2 flex-1">
              Submit Test
            </button>
          </div>

          {showPalette && (
            <div className="container pb-4 pt-2 max-h-64 overflow-y-auto">
              <QuestionPalette
                questions={test.questions}
                session={session}
                currentIndex={session.currentQuestion}
                onNavigate={navigateTo}
              />
            </div>
          )}
        </div>

        {/* ── MOBILE-ONLY sticky bottom navigation bar (< sm / 640px) ──────────── */}
        {/* Palette bottom-sheet overlay */}
        {showPalette && (
          <div className="sm:hidden fixed inset-0 z-40">
            {/* Dark backdrop — closes palette when tapped */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowPalette(false)}
              aria-hidden
            />
            {/* Sheet — sits above the nav bar (bottom-[58px]) */}
            <div
              className="absolute inset-x-0 bg-white rounded-t-2xl overflow-y-auto"
              style={{ bottom: 58, maxHeight: '65vh' }}
            >
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Questions Palette</h3>
                  <button
                    onClick={() => setShowPalette(false)}
                    className="h-7 w-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 text-sm font-bold"
                    aria-label="Close palette"
                  >
                    ✕
                  </button>
                </div>
                <QuestionPalette
                  questions={test.questions}
                  session={session}
                  currentIndex={session.currentQuestion}
                  onNavigate={navigateTo}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile 4-button sticky bottom nav */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200">
          <div
            className="grid grid-cols-4 gap-0"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Previous */}
            <button
              onClick={handlePrev}
              disabled={isFirst}
              aria-label="Previous question"
              className="flex flex-col items-center justify-center py-3 gap-0.5 text-slate-600 disabled:opacity-35 active:bg-slate-50 border-r border-slate-100"
            >
              <span className="text-base leading-none">‹</span>
              <span className="text-[10px] font-semibold">Prev</span>
            </button>

            {/* Mark Review */}
            <button
              onClick={handleMarkReview}
              aria-label={isMarked ? 'Unmark review' : 'Mark for review'}
              className={`flex flex-col items-center justify-center py-3 gap-0.5 border-r border-slate-100 active:bg-slate-50 ${
                isMarked ? 'text-purple-700' : 'text-slate-600'
              }`}
            >
              <span className="text-base leading-none">{isMarked ? '★' : '☆'}</span>
              <span className="text-[10px] font-semibold">Review</span>
            </button>

            {/* Palette toggle */}
            <button
              onClick={() => setShowPalette((p) => !p)}
              aria-label="Open question palette"
              className="flex flex-col items-center justify-center py-3 gap-0.5 text-slate-600 border-r border-slate-100 active:bg-slate-50"
            >
              <span className="text-base leading-none">☷</span>
              <span className="text-[10px] font-semibold">
                Q {session.currentQuestion + 1}/{test.questions.length}
              </span>
            </button>

            {/* Save & Next / Submit */}
            {isLast ? (
              <button
                onClick={() => setShowSubmit(true)}
                aria-label="Submit test"
                className="flex flex-col items-center justify-center py-3 gap-0.5 bg-red-50 text-red-700 active:bg-red-100"
              >
                <span className="text-base leading-none">✓</span>
                <span className="text-[10px] font-semibold">Submit</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                aria-label="Save and go to next question"
                className="flex flex-col items-center justify-center py-3 gap-0.5 bg-brand-600 text-white active:bg-brand-700"
              >
                <span className="text-base leading-none">›</span>
                <span className="text-[10px] font-semibold">Next</span>
              </button>
            )}
          </div>
        </div>

        {/* Spacer: pushes content above the sticky bottom bars */}
        <div className="sm:hidden h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
        <div className="hidden sm:block lg:hidden h-20" />
        <div className="hidden lg:block h-0" />
      </div>

      {showSubmit && (
        <SubmitConfirmModal
          session={session}
          questionIds={test.questions.map((q) => q.id)}
          onConfirm={handleFinalSubmit}
          onCancel={() => setShowSubmit(false)}
        />
      )}
    </div>
  );
}
