'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHistory, clearHistory } from '@/lib/exam/history';
import { formatTimeHuman } from '@/lib/exam/scoring';
import type { AttemptRecord } from '@/types/exam';

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);

  useEffect(() => {
    setAttempts(getHistory());
  }, []);

  const handleClear = () => {
    if (confirm('Clear all attempt history from this device?')) {
      clearHistory();
      setAttempts([]);
    }
  };

  return (
    <div className="min-h-screen bg-exam-bg">
      <div className="container py-10 md:py-14 max-w-2xl mx-auto">
        <Link href="/tre4" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
          ← BPSC TRE 4
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Attempt History</h1>
            <p className="text-sm text-slate-500 mt-1">Stored on this device only.</p>
          </div>
          {attempts.length > 0 && (
            <button onClick={handleClear} className="text-xs text-red-500 hover:text-red-700">
              Clear all
            </button>
          )}
        </div>

        {attempts.length === 0 && (
          <div className="card p-10 text-center text-slate-400">
            No attempts yet. <Link href="/tre4/daily" className="text-brand-600 underline">Start a test</Link> to see your history.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {attempts.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="font-bold text-slate-900">{a.testTitle}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(a.completedAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-extrabold text-brand-700">{a.score}/{a.maxScore}</div>
                  <div className="text-xs text-slate-500">{a.accuracy}% accuracy</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs font-medium">
                <Chip colour="green">✅ {a.correct} Correct</Chip>
                <Chip colour="red">❌ {a.wrong} Wrong</Chip>
                <Chip colour="amber">E {a.optionE} Option E</Chip>
                <Chip colour="slate">— {a.unanswered} Unanswered</Chip>
                <Chip colour="indigo">⏱ {formatTimeHuman(a.timeUsedMs)}</Chip>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ colour, children }: { colour: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-700',
  };
  return <span className={`px-2 py-1 rounded-full ${map[colour] ?? map.slate}`}>{children}</span>;
}
