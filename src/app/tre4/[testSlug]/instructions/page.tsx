import type { Metadata } from 'next';
import { buildInstructionsMetadata } from './_metadata';
import InstructionsClient from './InstructionsClient';

type Props = { params: { testSlug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildInstructionsMetadata(params.testSlug);
}

export default function InstructionsPage({ params }: Props) {
  return <InstructionsClient testSlug={params.testSlug} />;
}
