import type { Metadata } from 'next';
import Link from 'next/link';
import { tre4Tests } from '@/content/exams/tre4/tests';
import { tre4TopicGroups } from '@/content/exams/tre4/topics';
import { getPublishedDbTests } from '@/lib/test-provider';
import { RecentAttempts } from '@/components/RecentAttempts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BPSC TRE 4 Preparation — Daily Tests, Topics & Mock Exams',
  description:
    'Prepare for BPSC TRE 4 with daily practice tests, topic-wise MCQs in Hindi & English, real exam timer, and detailed result analysis.',
  alternates: { canonical: '/tre4' },
};

export default async function TRE4Page() {
  // Gather all published tests (static + DB), newest first
  type TestCard = {
    id: string; slug: string; date: string; title: string; titleHi: string;
    subject: string; totalQuestions: number; durationMinutes: number; difficulty: string;
  };

  let dbTests: TestCard[] = [];
  try {
    dbTests = await getPublishedDbTests({ exam: 'BPSC TRE 4' });
  } catch { /* DB unavailable — graceful degradation */ }

  const staticCards: TestCard[] = tre4Tests.map((t) => ({
    id: t.id, slug: t.slug, date: t.date, title: t.title, titleHi: t.titleHi,
    subject: t.subject, totalQuestions: t.config.totalQuestions, durationMinutes: t.config.durationMinutes, difficulty: t.difficulty,
  }));

  const allBySlug = new Map<string, TestCard>();
  for (const t of staticCards) allBySlug.set(t.slug, t);
  for (const t of dbTests) allBySlug.set(t.slug, t);
  const allSorted = [...allBySlug.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const latestTest = allSorted[0] ?? null;
  const recentTests = allSorted.slice(0, 5);

  return (
    <div className="min-h-screen bg-exam-bg">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-600 via-brand-700 to-purple-700 text-white py-14 md:py-20">
        <div className="container text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full mb-4">
            Bihar State Exams
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
            BPSC TRE 4 Preparation
          </h1>
          <p className="mt-4 text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
            Daily Practice Sets • Topic Tests • Timed Mocks
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {latestTest && (
              <Link href={`/tre4/${latestTest.slug}/instructions`} className="btn bg-white text-brand-700 hover:bg-brand-50 shadow-card-lg font-bold px-7 py-3">
                Start Today&apos;s Test →
              </Link>
            )}
            <Link href="/tre4/topics" className="btn bg-white/10 text-white border border-white/30 hover:bg-white/20 px-7 py-3">
              Browse Topics
            </Link>
          </div>
        </div>
      </section>

      <div className="container py-10 md:py-14 space-y-12">

        {/* Today's test card */}
        {latestTest && (
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Today&apos;s Test</h2>
            <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl">
                📜
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-1">
                  <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">{latestTest.subject}</span>
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{latestTest.difficulty}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{latestTest.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{latestTest.titleHi} • {latestTest.totalQuestions} Questions • {latestTest.durationMinutes} min</p>
              </div>
              <Link href={`/tre4/${latestTest.slug}/instructions`} className="btn-primary whitespace-nowrap">
                Start Test →
              </Link>
            </div>
          </section>
        )}

        {/* Subjects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Topic-wise Practice</h2>
            <Link href="/tre4/topics" className="text-sm text-brand-600 hover:text-brand-800 font-semibold">View All →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tre4TopicGroups.map((group) => (
              <Link
                href={`/tre4/topics?category=${group.id}`}
                key={group.id}
                className="card-hover p-4 text-center"
              >
                <div className={`mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br ${group.color} flex items-center justify-center text-white font-bold text-lg mb-3`}>
                  {group.label[0]}
                </div>
                <div className="font-semibold text-slate-800 text-sm">{group.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{group.labelHi}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Daily test list preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Recent Tests</h2>
            <Link href="/tre4/daily" className="text-sm text-brand-600 hover:text-brand-800 font-semibold">All Tests →</Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentTests.map((test) => (
              <div key={test.id} className="card-hover p-4 flex items-center gap-4">
                <div className="text-xs text-slate-400 shrink-0 w-20">
                  {new Date(test.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{test.title}</div>
                  <div className="text-xs text-slate-500">{test.totalQuestions}Q • {test.durationMinutes}min</div>
                </div>
                <Link href={`/tre4/${test.slug}/instructions`} className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap">
                  Start
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Why Practice Here?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🌐', title: 'Hindi + English', desc: 'Switch language anytime without resetting your session.' },
              { icon: '⏱', title: 'Real Exam Timer', desc: 'Timer persists through refresh — just like the real CBT.' },
              { icon: '📊', title: 'Detailed Results', desc: 'Score, accuracy, topic breakdown and category analysis.' },
              { icon: '🔄', title: 'Wrong Answer Revision', desc: 'Review mistakes with explanations. Save for later practice.' },
              { icon: '🗂', title: 'Topic Analysis', desc: 'See which areas need improvement after every test.' },
              { icon: '📱', title: 'Mobile Friendly', desc: 'Full exam experience on any screen size.' },
            ].map((f) => (
              <div key={f.title} className="card p-5">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold text-slate-900">{f.title}</div>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent attempts — client component, only renders if identity exists */}
        <RecentAttempts />

        {/* My Performance CTA */}
        <section>
          <div className="card p-6 bg-gradient-to-r from-brand-50 to-purple-50 border-brand-100">
            <h2 className="text-lg font-bold text-slate-900">My Performance</h2>
            <p className="text-sm text-slate-500 mt-1">Track your progress, review attempts and manage your revision list.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/tre4/history" className="btn-secondary text-sm">Attempt History</Link>
              <Link href="/tre4/revision" className="btn-secondary text-sm">Revision List</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
