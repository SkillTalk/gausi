'use client';

import { useState, useEffect } from 'react';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';
import type { ExamTest } from '@/types/exam';

type UseTestResult = {
  test: ExamTest | null;
  /** true while fetching a DB test; always false for static tests (resolved synchronously) */
  loading: boolean;
};

/**
 * Resolve a test by its slug.
 *
 * 1. Checks the static test registry first (zero latency, no network).
 * 2. If not found, fetches from GET /api/tests/[slug] which serves PUBLISHED DB tests.
 *
 * Only PUBLISHED DB tests are visible to students.
 */
export function useTest(testSlug: string): UseTestResult {
  // Static tests resolve synchronously — no loading state needed
  const staticTest = tre4TestsBySlug[testSlug] ?? null;

  const [dbTest, setDbTest] = useState<ExamTest | null>(null);
  const [loading, setLoading] = useState(!staticTest); // only load if static missed

  useEffect(() => {
    if (staticTest) return; // static test found — no API call needed

    let cancelled = false;
    setLoading(true);

    fetch(`/api/tests/${testSlug}`)
      .then((r) => r.json() as Promise<{ test?: ExamTest | null }>)
      .then((d) => {
        if (!cancelled) {
          setDbTest(d.test ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [testSlug, staticTest]);

  return {
    test: staticTest ?? dbTest,
    loading,
  };
}
