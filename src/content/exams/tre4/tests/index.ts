/**
 * Static test registry for TRE 4.
 *
 * To add a new test:
 *   1. Create the file: src/content/exams/tre4/tests/YYYY-MM-DD-slug.ts
 *   2. Add one import + one entry in the array below.
 *
 * The registry is sorted by date (newest first) at runtime in page components.
 * No filesystem scanning is used — this keeps Vercel builds deterministic.
 */

import type { ExamTest } from '@/types/exam';
import test_2026_08_19_1857 from './2026-08-19-1857';

export const tre4Tests: ExamTest[] = [test_2026_08_19_1857];

/** Convenience map for O(1) slug lookup */
export const tre4TestsBySlug: Record<string, ExamTest> = Object.fromEntries(
  tre4Tests.map((t) => [t.slug, t])
);
