import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Test History — BPSC TRE 4',
  description: 'View your personal BPSC TRE 4 test attempt history.',
  robots: { index: false, follow: false },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
