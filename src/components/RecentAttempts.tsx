'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import type { DbAttempt } from '@/types/exam';

export function RecentAttempts() {
  const { identity, loaded } = useUser();
  const [attempts, setAttempts] = useState<DbAttempt[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (!loaded || !identity) return;
    setStatus('loading');
    fetch(`/api/attempts?userId=${encodeURIComponent(identity.userId)}&limit=5`)
      .then(async (res) => {
        if (!res.ok) throw new Error('failed');
        const data = (await res.json()) as DbAttempt[];
        setAttempts(data.slice(0, 3));
        setStatus('done');
      })
      .catch(() => setStatus('error'));
  }, [loaded, identity]);

  // Don't render anything until localStorage has loaded (avoids hydration flash)
  if (!loaded) return null;
  // If no identity, show nothing (no broken empty section)
  if (!identity) return null;
  // On error, silently hide
  if (status === 'error') return null;
  // Still loading
  if (status === 'loading') return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Recent Attempts</h2>
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="card-hover p-4 h-14 animate-pulse bg-slate-100 rounded-2xl" />
        ))}
      </div>
    </section>
  );
  // No attempts yet
  if (status === 'done' && attempts.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Recent Attempts</h2>
        <Link href="/tre4/history" className="text-sm text-brand-600 hover:text-brand-800 font-semibold">
          View All →
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {attempts.map((a) => (
          <Link
            key={a.id}
            href={`/tre4/history/${a.id}`}
            className="card-hover p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 truncate">{a.testTitle}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Attempt #{a.attemptNumber} •{' '}
                {new Date(a.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-extrabold text-brand-700">{a.score}/{a.maxScore}</div>
              <div className="text-xs text-slate-500">{a.accuracy}% acc</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
