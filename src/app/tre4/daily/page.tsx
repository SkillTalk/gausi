import type { Metadata } from 'next';
import Link from 'next/link';
import { tre4Tests } from '@/content/exams/tre4/tests';
import { getPublishedDbTests } from '@/lib/test-provider';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily Practice Tests — BPSC TRE 4',
  description: 'Date-wise daily practice tests for BPSC TRE 4. New test every day covering History, Geography, Science and more.',
};

const DIFFICULTY_COLOUR: Record<string, string> = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-red-100 text-red-700',
};

type TestCard = {
  id: string;
  slug: string;
  date: string;
  title: string;
  titleHi: string;
  subject: string;
  difficulty: string;
  totalQuestions: number;
  durationMinutes: number;
};

export default async function DailyTestsPage() {
  // Merge static tests with PUBLISHED DB tests
  const staticCards: TestCard[] = tre4Tests.map((t) => ({
    id: t.id,
    slug: t.slug,
    date: t.date,
    title: t.title,
    titleHi: t.titleHi,
    subject: t.subject,
    difficulty: t.difficulty,
    totalQuestions: t.config.totalQuestions,
    durationMinutes: t.config.durationMinutes,
  }));

  let dbCards: TestCard[] = [];
  try {
    const dbTests = await getPublishedDbTests({ exam: 'BPSC TRE 4' });
    dbCards = dbTests.map((t) => ({
      id: t.id,
      slug: t.slug,
      date: t.date,
      title: t.title,
      titleHi: t.titleHi,
      subject: t.subject,
      difficulty: t.difficulty,
      totalQuestions: t.totalQuestions,
      durationMinutes: t.durationMinutes,
    }));
  } catch {
    // DB unavailable — graceful degradation to static only
  }

  // Merge and deduplicate by slug, DB tests take precedence
  const allBySlug = new Map<string, TestCard>();
  for (const t of staticCards) allBySlug.set(t.slug, t);
  for (const t of dbCards) allBySlug.set(t.slug, t);

  const sorted = [...allBySlug.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-exam-bg">
      <div className="container py-10 md:py-14">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tre4" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
            ← BPSC TRE 4
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900">Daily Practice Tests</h1>
          <p className="text-slate-500 mt-2">New test added every day. Newest first.</p>
        </div>

        {/* Test list */}
        <div className="flex flex-col gap-4">
          {sorted.map((test) => {
            const dateDisplay = new Date(test.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div key={test.id} className="card-hover p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Date + subject badge */}
                <div className="flex flex-col items-start sm:items-center sm:w-24 shrink-0">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{dateDisplay}</span>
                  <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full mt-1">
                    {test.subject}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h2 className="font-bold text-slate-900 text-lg">{test.title}</h2>
                  <p className="text-sm text-slate-500">{test.titleHi}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge>{test.totalQuestions} Questions</Badge>
                    <Badge>{test.durationMinutes} Minutes</Badge>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_COLOUR[test.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>
                      {test.difficulty}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div>
                  <Link
                    href={`/tre4/${test.slug}/instructions`}
                    className="btn-primary text-sm whitespace-nowrap"
                  >
                    Start Test →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-20 text-slate-400">No tests available yet. Check back soon!</div>
        )}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}
