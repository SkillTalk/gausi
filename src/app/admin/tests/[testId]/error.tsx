'use client';

/**
 * Error boundary for /admin/tests/[testId].
 * Catches runtime errors within the generated-test detail page and shows a
 * recoverable admin error state instead of crashing the entire app.
 */

import { useEffect } from 'react';

export default function AdminTestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminTestError]', error.message, error.digest ?? '');
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-lg font-bold text-slate-800">Unable to load generated test</h2>
      <p className="text-sm text-slate-500 max-w-sm">
        {error.message?.slice(0, 200) ?? 'An unexpected error occurred while rendering this page.'}
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 font-mono">digest: {error.digest}</p>
      )}
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors"
        >
          Retry
        </button>
        <a
          href="/admin/tests"
          className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
        >
          ← Back to Tests
        </a>
      </div>
    </div>
  );
}
