'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { EmailEntry } from '@/components/EmailEntry';
import { formatTimeHuman } from '@/lib/exam/scoring';
import type { DbAttempt, UserIdentity } from '@/types/exam';

export default function HistoryPage() {
  const { identity, loaded, setIdentity, clearUser } = useUser();
  const [attempts, setAttempts] = useState<DbAttempt[]>([]);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const loadHistory = async (userId: string) => {
    setFetchStatus('loading');
    try {
      const res = await fetch(`/api/attempts?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as DbAttempt[];
      setAttempts(data);
      setFetchStatus('done');
    } catch {
      setFetchStatus('error');
    }
  };

  useEffect(() => {
    if (loaded && identity) {
      loadHistory(identity.userId);
    } else if (loaded && !identity) {
      setFetchStatus('idle');
    }
  }, [loaded, identity]);

  const handleEmailSuccess = (id: UserIdentity) => {
    setIdentity(id);
  };

  const handleChangeEmail = () => {
    clearUser();
    setAttempts([]);
    setFetchStatus('idle');
  };

  return (
    <div className="min-h-screen bg-exam-bg">
      <div className="container py-10 md:py-14 max-w-2xl mx-auto">
        <Link href="/tre4" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6">
          ← BPSC TRE 4
        </Link>

        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">My Test History</h1>
            <p className="text-sm text-slate-500 mt-1">
              {identity
                ? `Showing history for ${identity.email}`
                : 'Enter your email to view your test history'}
            </p>
          </div>
          {identity && (
            <button
              onClick={handleChangeEmail}
              className="text-xs text-slate-500 hover:text-slate-900 underline whitespace-nowrap mt-1"
            >
              Change Email
            </button>
          )}
        </div>

        {/* No identity — show email entry */}
        {loaded && !identity && (
          <EmailEntry onSuccess={handleEmailSuccess} />
        )}

        {/* Loading */}
        {fetchStatus === 'loading' && (
          <div className="card p-10 text-center text-slate-400 animate-pulse">
            Loading history…
          </div>
        )}

        {/* Error */}
        {fetchStatus === 'error' && (
          <div className="card p-6 text-center">
            <p className="text-slate-600 mb-3">Could not load history. Please try again.</p>
            <button
              onClick={() => identity && loadHistory(identity.userId)}
              className="btn-secondary text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {fetchStatus === 'done' && attempts.length === 0 && (
          <div className="card p-10 text-center text-slate-400">
            No attempts yet.{' '}
            <Link href="/tre4/daily" className="text-brand-600 underline">
              Start a test
            </Link>{' '}
            to see your history.
          </div>
        )}

        {/* Attempt list */}
        {fetchStatus === 'done' && attempts.length > 0 && (
          <div className="flex flex-col gap-4">
            {attempts.map((a) => (
              <AttemptCard key={a.id} attempt={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttemptCard({ attempt: a }: { attempt: DbAttempt }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-900 truncate">{a.testTitle}</h2>
          {a.subject && (
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
              {a.subject}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-extrabold text-brand-700">
            {a.score}/{a.maxScore}
          </div>
          <div className="text-xs text-slate-500">{a.accuracy}% accuracy</div>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        Attempt #{a.attemptNumber} •{' '}
        {new Date(a.submittedAt).toLocaleString('en-IN')} •{' '}
        {a.language === 'hi' ? 'हिंदी' : 'English'}
      </p>

      <div className="flex flex-wrap gap-2 text-xs font-medium mb-4">
        <Chip colour="green">✅ {a.correct} Correct</Chip>
        <Chip colour="red">❌ {a.wrong} Wrong</Chip>
        <Chip colour="amber">E {a.optionE} Option E</Chip>
        <Chip colour="slate">— {a.unanswered} Unanswered</Chip>
        <Chip colour="indigo">⏱ {formatTimeHuman(a.timeUsedSeconds * 1000)}</Chip>
      </div>

      <Link href={`/tre4/history/${a.id}`} className="btn-secondary text-xs py-2 block text-center">
        View Result
      </Link>
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
