import type { Metadata } from 'next';

// Revision uses client-local data only — no value to search engines.
export const metadata: Metadata = {
  title: 'My Revision List — BPSC TRE 4',
  robots: { index: false, follow: false },
};

export default function RevisionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
