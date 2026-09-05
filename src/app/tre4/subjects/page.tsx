import type { Metadata } from 'next';
import Link from 'next/link';
import { tre4SubjectSeries } from '@/content/exams/tre4/subjects';
import { getPublishedDbTests } from '@/lib/test-provider';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Subject-wise Tests — BPSC TRE 4 | GAUSI',
  description: 'Practice BPSC TRE 4 subject-wise: Music, English, Computer Science, Hindi, Sanskrit and all specialist subjects in Hindi & English.',
  alternates: { canonical: '/tre4/subjects' },
};

export default async function SubjectsPage() {
  // Fetch all published tests once, then group by category (uses shared cache)
  let dbTests: Awaited<ReturnType<typeof getPublishedDbTests>> = [];
  try {
    dbTests = await getPublishedDbTests({ exam: 'BPSC TRE 4' });
  } catch { /* DB unavailable — degrade gracefully */ }

  // Count published tests per category
  const countByCategory = new Map<string, number>();
  for (const t of dbTests) {
    countByCategory.set(t.subject, (countByCategory.get(t.subject) ?? 0) + 1);
  }

  return (
    <div className="min-h-screen bg-exam-bg">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white py-12 md:py-16">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/15 border border-white/20 px-3 py-1.5 rounded-full mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-300 animate-pulse" />
            BPSC TRE 4 · All Subjects
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Subject-wise Tests
          </h1>
          <p className="mt-3 text-white/75 text-base max-w-xl mx-auto">
            Full subject papers — Music, English, Computer Science, Hindi and more.
            <br />
            <span className="text-white/55 text-sm">Tests numbered Test 1, Test 2 … in order of release.</span>
          </p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Link href="/tre4/topics" className="btn bg-white/10 text-white border border-white/25 hover:bg-white/20 px-5 py-2 text-sm">
              ← Topic-wise Practice
            </Link>
            <Link href="/tre4" className="btn bg-white/10 text-white border border-white/25 hover:bg-white/20 px-5 py-2 text-sm">
              BPSC TRE 4 Home
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Subject grid ────────────────────────────────────────────────── */}
      <section className="container py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tre4SubjectSeries.map((subject) => {
            const count = countByCategory.get(subject.category) ?? 0;
            return (
              <Link
                key={subject.slug}
                href={`/tre4/subjects/${subject.slug}`}
                className={`group relative flex flex-col items-center text-center bg-white border border-slate-200 rounded-2xl p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 ${count === 0 ? 'opacity-60' : ''}`}
              >
                {/* Icon circle */}
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${subject.gradient} flex items-center justify-center text-2xl shadow-sm mb-3`}>
                  {subject.icon}
                </div>

                <p className="font-bold text-slate-800 text-sm leading-tight">{subject.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{subject.labelHi}</p>

                {count > 0 ? (
                  <span className="mt-2 inline-block text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                    {count} test{count !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="mt-2 inline-block text-xs text-slate-400">
                    Coming soon
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Info banner ─────────────────────────────────────────────────── */}
      <section className="container pb-14">
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
          <p className="text-purple-800 text-sm font-semibold mb-1">🎯 How it works</p>
          <p className="text-purple-700 text-sm">
            Each subject has numbered tests (Test 1, Test 2 …) released over time.
            All questions are bilingual (Hindi & English) with detailed explanations.
          </p>
        </div>
      </section>
    </div>
  );
}
