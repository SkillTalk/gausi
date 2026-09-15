import type { Metadata } from 'next';
import { buildInstructionsMetadata } from './_metadata';
import { getTestMetaBySlug } from '@/lib/test-provider';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';
import InstructionsClient from './InstructionsClient';

type Props = { params: { testSlug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildInstructionsMetadata(params.testSlug);
}

/** Pre-build instructions pages for all static tests at deploy time. */
export function generateStaticParams() {
  return Object.keys(tre4TestsBySlug).map((slug) => ({ testSlug: slug }));
}

// ISR: revalidate every 60 s so newly published DB tests appear without full redeploy.
export const revalidate = 60;

export default async function InstructionsPage({ params }: Props) {
  // Fetch lean test metadata server-side — eliminates the client-side loading
  // spinner and the extra round-trip from InstructionsClient.
  const testMeta = await getTestMetaBySlug(params.testSlug);
  return <InstructionsClient testSlug={params.testSlug} testMeta={testMeta} />;
}
