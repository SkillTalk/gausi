'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, saveSession, markVisited } from '@/lib/exam/session';
import type { Lang, UserIdentity } from '@/types/exam';
import { LanguageSelector } from '@/components/exam/LanguageSelector';
import { EmailEntry } from '@/components/EmailEntry';
import { useUser } from '@/hooks/useUser';
import Link from 'next/link';
import type { TestMeta } from '@/lib/test-provider';
import { TRE4_MARKS } from '@/content/exams/tre4/config';

type Props = {
  testSlug: string;
  /** Pre-fetched by the server component — skip loading state when provided. */
  testMeta?: TestMeta | null;
};

type Step = 'loading' | 'email' | 'instructions';

export default function InstructionsClient({ testSlug, testMeta }: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('hi');
  // If the server passed testMeta, skip the 'loading' step directly.
  const [step, setStep] = useState<Step>(testMeta ? 'loading' : 'loading');
  const { identity, loaded, setIdentity } = useUser();

  // Once localStorage (identity) is ready, decide email vs instructions step.
  // testMeta from server is always immediately available — no extra wait.
  useEffect(() => {
    if (!loaded) return;
    if (!testMeta) return; // will render "not found" below
    setStep(identity ? 'instructions' : 'email');
  }, [loaded, identity, testMeta]);

  if (!testMeta) {
    return (
      <div className="exam-surface flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Test not found.</p>
      </div>
    );
  }

  const marks = TRE4_MARKS;

  // Format a mark value for display, converting known fractions to readable strings.
  // e.g. -(1/3) → '-1/3'  rather than '-0.3333333333333333'
  function formatMarkDisplay(v: number): string {
    if (Math.abs(v - -(1 / 3)) < 1e-9) return '-1/3';
    if (Math.abs(v - 1 / 3) < 1e-9) return '+1/3';
    return v >= 0 ? `+${v}` : `${v}`;
  }

  const handleEmailSuccess = (id: UserIdentity) => {
    setIdentity(id);
    setStep('instructions');
  };

  const handleStart = () => {
    let session = createSession(testMeta!.id, testMeta!.durationMinutes, lang);
    if (testMeta!.firstQuestionId) session = markVisited(session, testMeta!.firstQuestionId);
    saveSession(session);
    router.push(`/tre4/${testSlug}/test`);
  };

  // Loading skeleton — avoids layout flash
  if (step === 'loading') {
    return (
      <div className="exam-surface flex items-center justify-center min-h-screen">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="exam-surface min-h-screen">
      <div className="container py-8 md:py-14 max-w-2xl mx-auto">
        <Link href="/tre4/daily" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-8">
          ← Back to Daily Tests
        </Link>

        {/* Test header */}
        <div className="card p-6 mb-6 text-center bg-gradient-to-br from-brand-600 to-purple-600 text-white border-0 shadow-card-lg">
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">{testMeta.subject} • {testMeta.difficulty}</span>
          <h1 className="text-2xl font-extrabold mt-1">{testMeta.title}</h1>
          <p className="text-sm opacity-80 mt-1">{testMeta.date}</p>
        </div>

        {/* Email step — shown when no identity yet */}
        {step === 'email' && (
          <div className="mb-6">
            <EmailEntry onSuccess={handleEmailSuccess} />
            <p className="text-center text-xs text-slate-400 mt-3">
              You can also{' '}
              <button
                onClick={() => setStep('instructions')}
                className="underline hover:text-slate-600"
              >
                skip for now
              </button>{' '}
              — your result won&apos;t be saved to your history.
            </p>
          </div>
        )}

        {/* Instructions + Start — shown after identity confirmed */}
        {step === 'instructions' && (
          <>
            {/* Identity banner */}
            {identity && (
              <div className="mb-4 rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-brand-800 flex items-center justify-between gap-2">
                <span>Saving history as <strong>{identity.email}</strong></span>
                <button
                  onClick={() => setStep('email')}
                  className="text-xs text-brand-600 hover:text-brand-900 underline whitespace-nowrap"
                >
                  Change
                </button>
              </div>
            )}

            {/* Language selection */}
            <div className="card p-6 mb-6 text-center">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Choose Your Test Language</h2>
              <p className="text-sm text-slate-500 mb-5">
                You can switch language during the test without resetting your answers or timer.
              </p>
              <LanguageSelector selected={lang} onChange={setLang} showSwitchNote />
            </div>

            {/* Instructions */}
            <div className="card p-6 mb-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Test Instructions</h2>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '📝', label: 'Questions', value: testMeta.totalQuestions },
                  { icon: '⏱', label: 'Duration', value: `${testMeta.durationMinutes} min` },
                  { icon: '🎯', label: 'Type', value: 'MCQ' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-center">
                    <div className="text-xl">{s.icon}</div>
                    <div className="font-bold text-brand-900 mt-1">{s.value}</div>
                    <div className="text-xs text-brand-700 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 divide-y divide-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 font-semibold text-sm text-slate-700 bg-slate-100">
                  Marking Scheme
                </div>
                {[
                  { label: '✅ Correct answer', value: `+${marks.correct}`, colour: 'text-green-700' },
                  { label: '❌ Wrong answer', value: formatMarkDisplay(marks.wrong), colour: 'text-red-700' },
                  { label: 'E — I do not want to answer', value: `${marks.optionE === 0 ? '0 (no penalty)' : marks.optionE}`, colour: 'text-amber-700' },
                  { label: '— Not answered', value: `${marks.unanswered}`, colour: 'text-slate-600' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-700">{row.label}</span>
                    <span className={`font-bold ${row.colour}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 text-sm text-slate-700">
                <InfoRow icon="🔤">Options A, B, C, D are regular answers. <strong>Option E</strong> means you choose to skip — no negative marking.</InfoRow>
                <InfoRow icon="⏱">Timer starts when you click <strong>Start Test</strong> and continues even if you refresh the page.</InfoRow>
                <InfoRow icon="💾">Your answers are auto-saved as you go.</InfoRow>
                <InfoRow icon="📱">Use the question palette to jump to any question.</InfoRow>
              </div>
            </div>

            <button onClick={handleStart} className="btn-primary w-full py-4 text-base">
              Start Test — {lang === 'hi' ? 'हिंदी' : 'English'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
