import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Result — BPSC TRE 4',
  robots: { index: false, follow: false },
};

export default function AttemptLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
