'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';
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
import type { ExamSession, Lang, OptionKey } from '@/types/exam';
import { QuestionCard } from '@/components/exam/QuestionCard';
import { QuestionPalette } from '@/components/exam/QuestionPalette';
import { ExamHeader } from '@/components/exam/ExamHeader';
import { ExamNavBar } from '@/components/exam/ExamNavBar';
import { SubmitConfirmModal } from '@/components/exam/SubmitConfirmModal';

type PageProps = { params: Promise<{ testSlug: string }> };

const RESULT_KEY = 'exam-result-';

export default function TestPage({ params }: PageProps) {
  const { testSlug } = use(params);
  const router = useRouter();
  const test = tre4TestsBySlug[testSlug];

  const [session, setSession] = useState<ExamSession | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const autoSubmitFired = useRef(false);

  // Load session from localStorage on mount
  useEffect(() => {
    if (!test) return;
    const existing = loadSession(test.id);
    if (!existing || existing.submitted) {
      // No valid active session → redirect to instructions
      router.replace(`/tre4/${testSlug}/instructions`);
      return;
    }
    // If session already expired, auto-submit immediately
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

  const handleAutoSubmit = useCallback((s: ExamSession) => {
    if (autoSubmitFired.current) return;
    autoSubmitFired.current = true;
    const submitted = submitSession(s);
    saveSession(submitted);
    if (test) {
      const result = calculateResult(test, submitted);
      localStorage.setItem(RESULT_KEY + test.id, JSON.stringify(result));
      addAttempt(test, result);
    }
    router.replace(`/tre4/${testSlug}/result`);
  }, [test, testSlug, router]);

  const handleTimerExpire = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      handleAutoSubmit(prev);
      return prev;
    });
  }, [handleAutoSubmit]);

  const handleSelectOption = (option: OptionKey) => {
    updateSession((s) => {
      const q = test.questions[s.currentQuestion];
      if (!q) return s;
      return setAnswer(s, q.id, option);
    });
  };

  const handleClearResponse = () => {
    updateSession((s) => {
      const q = test.questions[s.currentQuestion];
      if (!q) return s;
      return clearAnswer(s, q.id);
    });
  };

  const handleMarkReview = () => {
    updateSession((s) => {
      const q = test.questions[s.currentQuestion];
      if (!q) return s;
      return toggleMarkForReview(s, q.id);
    });
  };

  const navigateTo = (index: number) => {
    updateSession((s) => {
      const q = test.questions[index];
      if (!q) return s;
      return markVisited(setCurrentQuestion(s, index), q.id);
    });
    setShowPalette(false);
  };

  const handleNext = () => {
    if (!session) return;
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
    router.push(`/tre4/${testSlug}/result`);
  };

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

      <div className="container py-4 md:py-6">
        <div className="flex gap-6 items-start">
          {/* Main question area */}
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
                <div className="mt-4">
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

          {/* Desktop palette */}
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

        {/* Mobile palette toggle */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 pb-safe">
          <div className="container py-2 flex items-center justify-between gap-2">
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

        {/* Bottom spacer for mobile */}
        <div className="h-24 lg:h-0" />
      </div>

      {/* Submit modal */}
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
