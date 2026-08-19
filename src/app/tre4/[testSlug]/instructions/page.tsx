'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';
import { createSession, saveSession, markVisited } from '@/lib/exam/session';
import type { Lang } from '@/types/exam';
import { LanguageSelector } from '@/components/exam/LanguageSelector';
import Link from 'next/link';

type PageProps = { params: { testSlug: string } };

export default function InstructionsPage({ params }: PageProps) {
  const { testSlug } = params;
  const router = useRouter();
  const test = tre4TestsBySlug[testSlug];
  const [lang, setLang] = useState<Lang>('hi');

  if (!test) {
    return (
      <div className="exam-surface flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Test not found.</p>
      </div>
    );
  }

  const { config } = test;
  const { marks } = config;

  const handleStart = () => {
    let session = createSession(test.id, config.durationMinutes, lang);
    // Mark first question as visited
    const firstQ = test.questions[0];
    if (firstQ) session = markVisited(session, firstQ.id);
    saveSession(session);
    router.push(`/tre4/${testSlug}/test`);
  };

  return (
    <div className="exam-surface min-h-screen">
      <div className="container py-8 md:py-14 max-w-2xl mx-auto">
        {/* Back */}
        <Link href="/tre4/daily" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-8">
          ← Back to Daily Tests
        </Link>

        {/* Test header */}
        <div className="card p-6 mb-6 text-center bg-gradient-to-br from-brand-600 to-purple-600 text-white border-0 shadow-card-lg">
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">{test.subject} • {test.difficulty}</span>
          <h1 className="text-2xl font-extrabold mt-1">{test.title}</h1>
          <p className="text-sm opacity-80 mt-1">{test.date}</p>
        </div>

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

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '📝', label: 'Questions', value: config.totalQuestions },
              { icon: '⏱', label: 'Duration', value: `${config.durationMinutes} min` },
              { icon: '🎯', label: 'Type', value: 'MCQ' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-brand-50 border border-brand-100 p-3 text-center">
                <div className="text-xl">{s.icon}</div>
                <div className="font-bold text-brand-900 mt-1">{s.value}</div>
                <div className="text-xs text-brand-700 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Marking scheme */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 divide-y divide-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 font-semibold text-sm text-slate-700 bg-slate-100">
              Marking Scheme
            </div>
            {[
              { label: '✅ Correct answer', value: `+${marks.correct}`, colour: 'text-green-700' },
              { label: '❌ Wrong answer', value: `${marks.wrong}`, colour: 'text-red-700' },
              { label: 'E — I do not want to answer', value: `${marks.optionE === 0 ? '0 (no penalty)' : marks.optionE}`, colour: 'text-amber-700' },
              { label: '— Not answered', value: `${marks.unanswered}`, colour: 'text-slate-600' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-700">{row.label}</span>
                <span className={`font-bold ${row.colour}`}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div className="space-y-2.5 text-sm text-slate-700">
            <InfoRow icon="🔤">Options A, B, C, D are regular answers. <strong>Option E</strong> means you choose to skip — no negative marking.</InfoRow>
            <InfoRow icon="⏱">Timer starts when you click <strong>Start Test</strong> and continues even if you refresh the page.</InfoRow>
            <InfoRow icon="💾">Your answers are auto-saved as you go.</InfoRow>
            <InfoRow icon="📱">Use the question palette to jump to any question.</InfoRow>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="btn-primary w-full py-4 text-base"
        >
          Start Test — {lang === 'hi' ? 'हिंदी' : 'English'}
        </button>
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
