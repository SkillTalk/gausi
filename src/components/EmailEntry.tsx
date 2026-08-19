'use client';

import { useState, useId } from 'react';
import { isValidEmail, normalizeEmail } from '@/lib/user-identity';
import type { UserIdentity } from '@/types/exam';

interface EmailEntryProps {
  onSuccess: (identity: UserIdentity) => void;
}

type Status = 'idle' | 'loading' | 'error';

export function EmailEntry({ onSuccess }: EmailEntryProps) {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const normalized = normalizeEmail(email);
  const valid = isValidEmail(normalized);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }

      const user = (await res.json()) as { id: string; email: string };
      onSuccess({ userId: user.id, email: user.email });
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  return (
    <div className="card p-6 max-w-md mx-auto">
      {/* Gradient decoration */}
      <div className="h-1 -mx-6 -mt-6 mb-6 rounded-t-2xl bg-gradient-to-r from-brand-500 to-purple-500" />

      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Save Your Test History</h2>
      <p className="text-sm text-slate-600 mb-5 leading-relaxed">
        Enter your email to save and access your test history across devices.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700 mb-1.5">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errorMsg) setErrorMsg('');
          }}
          disabled={status === 'loading'}
          className={`
            w-full px-4 py-3 rounded-xl border text-base bg-white
            focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400
            disabled:opacity-60 transition
            ${errorMsg ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-300'}
          `}
        />

        {errorMsg && (
          <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !email.trim()}
          className="btn-primary w-full mt-4 py-3 text-base disabled:opacity-50"
        >
          {status === 'loading' ? 'Creating your history…' : 'Continue →'}
        </button>
      </form>

      <p className="mt-4 text-xs text-slate-400 text-center leading-relaxed">
        Your email is used only to identify your test history.
        No OTP or password is required.
      </p>
    </div>
  );
}
