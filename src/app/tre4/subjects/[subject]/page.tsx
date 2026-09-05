import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { tre4SubjectsBySlug } from '@/content/exams/tre4/subjects';
import { getPublishedDbTests } from '@/lib/test-provider';

export const revalidate = 60;

type Props = { params: Promise<{ subject: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject: slug } = await params;
  const subjectInfo = tre4SubjectsBySlug[slug];
  if (!subjectInfo) return { title: 'Subject Tests — BPSC TRE 4' };

  return {
    title: `${subjectInfo.label} Tests — BPSC TRE 4 | GAUSI`,
    description: `Practice BPSC TRE 4 ${subjectInfo.label} (${subjectInfo.labelHi}) with numbered subject tests in Hindi & English. Detailed explanations for every question.`,
    alternates: { canonical: `/tre4/subjects/${slug}` },
  };
}

export default async function SubjectTestListPage({ params }: Props) {
  const { subject: slug } = await params;
  const subjectInfo = tre4SubjectsBySlug[slug];
  if (!subjectInfo) notFound();

  // Fetch published tests for this subject (uses shared ISR cache)
  let tests: Awaited<ReturnType<typeof getPublishedDbTests>> = [];
  try {
    tests = await getPublishedDbTests({ exam: 'BPSC TRE 4', category: subjectInfo.category });
  } catch { /* DB unavailable */ }

  // Sort oldest → newest (Test 1 = earliest published)
  const sorted = [...tests].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );

  function difficultyColor(d: string) {
    if (d === 'Beginner') return 'text-green-700 bg-green-50';
    if (d === 'Advanced') return 'text-red-700 bg-red-50';
    return 'text-amber-700 bg-amber-50';
  }

  return (
    <div className="min-h-screen bg-exam-bg">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <section className={`bg-gradient-to-br ${subjectInfo.gradient} text-white py-12 md:py-14`}>
        <div className="container">
          <Link href="/tre4/subjects" className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            ← All Subjects
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-sm">
              {subjectInfo.icon}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold">{subjectInfo.label}</h1>
              <p className="text-white/70 text-lg mt-0.5">{subjectInfo.labelHi}</p>
            </div>
          </div>
          <p className="mt-4 text-white/75 text-sm">
            {sorted.length > 0
              ? `${sorted.length} test${sorted.length !== 1 ? 's' : ''} available · Bilingual (Hindi & English) · With explanations`
              : 'Tests coming soon — check back later'}
          </p>
        </div>
      </section>

      {/* ─── Test list ───────────────────────────────────────────────────── */}
      <section className="container py-10">
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{subjectInfo.icon}</div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">{subjectInfo.label} tests are coming soon!</h2>
            <p className="text-slate-500 text-sm mb-6">We&apos;re preparing high-quality questions for this subject. Check back in a few days.</p>
            <Link href="/tre4/subjects" className="btn-secondary">
              ← Browse Other Subjects
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((test, idx) => (
              <Link
                key={test.id}
                href={`/tre4/${test.slug}/instructions`}
                className="group flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:border-purple-300 transition-all"
              >
                {/* Test number badge */}
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${subjectInfo.gradient} flex items-center justify-center text-white font-extrabold text-lg shadow-sm shrink-0`}>
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 truncate">{test.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`font-semibold px-2 py-0.5 rounded-full ${difficultyColor(test.difficulty)}`}>
                      {test.difficulty}
                    </span>
                    <span className="text-slate-400">{test.totalQuestions}Q · {test.durationMinutes} min</span>
                    <span className="text-slate-400">
                      {new Date(test.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl group-hover:bg-purple-100 transition-colors">
                    Start
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─── Footer CTA ──────────────────────────────────────────────────── */}
      <section className="container pb-14">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/tre4/subjects" className="btn-secondary">← All Subjects</Link>
          <Link href="/tre4/topics" className="btn-secondary">Topic-wise Practice</Link>
          <Link href="/tre4/daily" className="btn-secondary">Daily Tests</Link>
        </div>
      </section>
    </div>
  );
}
