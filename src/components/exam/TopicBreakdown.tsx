'use client';

import type { CategoryResult } from '@/types/exam';

type Props = { categoryResults: CategoryResult[] };

export function TopicBreakdown({ categoryResults }: Props) {
  const sorted = [...categoryResults].sort((a, b) => {
    const scoreA = a.total > 0 ? a.correct / a.total : 0;
    const scoreB = b.total > 0 ? b.correct / b.total : 0;
    return scoreA - scoreB;
  });

  const weakest = sorted[0];

  return (
    <div className="card p-6 space-y-5 animate-fade-in">
      <h3 className="font-bold text-slate-900 text-lg">Topic Performance</h3>

      {sorted.map((cat) => {
        const pct = cat.total > 0 ? Math.round((cat.correct / cat.total) * 100) : 0;
        const isWeakest = cat.category === weakest?.category;

        return (
          <div key={cat.category}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                {cat.category}
                {isWeakest && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                    Needs Improvement
                  </span>
                )}
              </span>
              <span className="text-sm font-bold text-slate-900">
                {cat.correct}/{cat.total}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${cat.category}: ${pct}%`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
