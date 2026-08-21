'use client';

/**
 * /admin/login — Admin authentication page.
 *
 * useSearchParams() requires Suspense boundary in Next.js 14.
 * Outer component renders the shell; LoginForm is the Suspense-wrapped inner.
 */

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// ─── Inner form (uses useSearchParams → must be wrapped in Suspense) ──────────

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooMany, setTooMany] = useState(false);

  const nextParam = searchParams.get('next');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, next: nextParam }),
      });

      const data = await res.json() as { ok?: boolean; redirectTo?: string; error?: string };

      if (res.status === 429) {
        setTooMany(true);
        setError('Too many failed attempts. Please wait 15 minutes before trying again.');
      } else if (res.ok && data.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace((data.redirectTo ?? '/admin/tests') as any);
      } else {
        setError(data.error ?? 'Invalid admin credentials.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => { void handleSubmit(e); }}
      className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5"
    >
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
          Admin Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          disabled={loading || tooMany}
          placeholder="Enter admin password"
          className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 text-sm"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-900/40 border border-red-700/50 text-red-300 text-sm rounded-xl px-4 py-3">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || tooMany || !password}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
      >
        {loading ? 'Verifying…' : 'Login'}
      </button>
    </form>
  );
}

// ─── Login page shell ─────────────────────────────────────────────────────────

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl mb-4 shadow-lg">
            G
          </div>
          <h1 className="text-2xl font-extrabold text-white">GAUSI Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Secure admin access only</p>
        </div>

        <Suspense
          fallback={
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center text-slate-400 text-sm">
              Loading…
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-slate-600 mt-6">
          Unauthorised access is prohibited.
        </p>
      </div>
    </div>
  );
}
