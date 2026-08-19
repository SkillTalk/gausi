'use client';

import type { ExamResult } from '@/types/exam';
import { formatTimeHuman } from '@/lib/exam/scoring';

type Props = { result: ExamResult };

export function ResultSummary({ result }: Props) {
  const pct = Math.round((result.score / result.maxScore) * 100 * 10) / 10;
  const circumference = 2 * Math.PI * 36; // radius=36
  const offset = circumference - (result.accuracy / 100) * circumference;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Score hero */}
      <div className="card p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-2">Your Score</p>
        <div className="text-5xl font-extrabold text-slate-900">
          {result.score}
          <span className="text-2xl text-slate-400 font-medium"> / {result.maxScore}</span>
        </div>
        <p className="mt-1 text-slate-500 text-sm">{pct}% of maximum marks</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Correct" value={result.correct} colour="green" />
        <StatCard label="Wrong" value={result.wrong} colour="red" />
        <StatCard label="Option E" value={result.optionE} colour="amber" />
        <StatCard label="Unanswered" value={result.unanswered} colour="slate" />
        <StatCard label="Attempted" value={result.attempted} colour="blue" />
        <StatCard label="Time Used" value={formatTimeHuman(result.timeUsedMs)} colour="indigo" />
      </div>

      {/* Accuracy ring */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#E2E8F0" strokeWidth="8" />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#4F46E5"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-bold text-brand-700 text-lg">
            {result.accuracy}%
          </span>
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-lg">Accuracy</p>
          <p className="text-sm text-slate-500 mt-1">
            You answered correctly {result.correct} out of {result.attempted} attempted questions.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  colour,
}: {
  label: string;
  value: number | string;
  colour: string;
}) {
  const colourMap: Record<string, string> = {
    green: 'bg-green-50 text-green-800 border-green-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  };

  return (
    <div className={`rounded-xl border px-4 py-4 ${colourMap[colour] ?? colourMap.slate}`}>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs font-semibold mt-1 uppercase tracking-wide opacity-70">{label}</div>
    </div>
  );
}
