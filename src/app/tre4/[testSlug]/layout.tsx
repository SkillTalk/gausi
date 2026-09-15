/**
 * Layout for /tre4/[testSlug]/* routes.
 *
 * Exports generateStaticParams so Next.js pre-builds the instructions, test,
 * and result routes for every static test slug at deploy time.
 * DB-generated (published) tests are served dynamically via ISR (revalidate=60
 * on the instructions page).
 */
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';

export function generateStaticParams() {
  return Object.keys(tre4TestsBySlug).map((slug) => ({ testSlug: slug }));
}

export default function TestSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
