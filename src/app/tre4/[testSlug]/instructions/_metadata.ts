import type { Metadata } from 'next';
import { getTestBySlug } from '@/lib/test-provider';

/**
 * Pure metadata builder — no JSX, safely importable in test environments.
 * Called by generateMetadata in the Server Component page wrapper.
 */
export async function buildInstructionsMetadata(testSlug: string): Promise<Metadata> {
  let test;
  try {
    test = await getTestBySlug(testSlug);
  } catch {
    // DB or resolution failure — fall back to root layout defaults
    return {};
  }

  if (!test) return {};

  const canonicalPath = `/tre4/${testSlug}/instructions`;
  const description =
    test.description ??
    `Practice ${test.config.totalQuestions} BPSC TRE 4 ${test.subject} questions in Hindi and English. ${test.config.durationMinutes}-minute timed test with negative marking.`;

  return {
    title: `${test.title} — BPSC TRE 4 Practice Test`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${test.title} — BPSC TRE 4 Practice Test`,
      description,
      url: canonicalPath,
    },
  };
}
