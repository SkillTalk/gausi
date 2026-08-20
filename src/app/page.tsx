import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { tre4Tests } from '@/content/exams/tre4/tests';
import { tre4TopicGroups } from '@/content/exams/tre4/topics';
import { siteConfig } from '@/content/site';
import { MotionSection } from '@/components/MotionSection';

export const metadata: Metadata = {
  title: 'GAUSI | Government Exam Preparation',
  description: siteConfig.description,
};

export default function HomePage() {
  const latestTest = [...tre4Tests].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  return (
    <div className="overflow-x-hidden">
      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-purple-800 text-white">
        {/* Decorative blobs */}
        <div className="blob top-[-80px] left-[-80px] h-72 w-72 bg-purple-400" style={{ animationDelay: '0s' }} aria-hidden />
        <div className="blob bottom-[-60px] right-[-60px] h-96 w-96 bg-indigo-400" style={{ animationDelay: '3s' }} aria-hidden />
        <div className="blob top-[30%] left-[40%] h-56 w-56 bg-cyan-400 opacity-20" style={{ animationDelay: '5s' }} aria-hidden />

        <div className="container relative z-10 py-10 sm:py-16 md:py-24 text-center">
          <MotionSection>
            {/* GAUSI icon — square, compact, works on any bg */}
            <div className="flex justify-center mb-4 sm:mb-5">
              <Image
                src="/branding/gausi-icon-192.png"
                alt="GAUSI"
                width={80}
                height={80}
                sizes="(max-width: 640px) 64px, 80px"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl shadow-lg"
                priority
              />
            </div>

            <div className="mb-1">
              <span className="text-white font-extrabold text-2xl sm:text-3xl tracking-tight">GAUSI</span>
            </div>
            <p className="text-white/60 text-xs sm:text-sm font-medium tracking-wide mb-4">
              {siteConfig.fullForm}
            </p>

            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/15 border border-white/20 px-3 py-1.5 rounded-full mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
              Bihar State Exams • BPSC TRE 4
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
              Prepare Smarter for
              <br />
              <span className="text-cyan-300">Government Exams</span>
            </h1>

            <p className="mt-6 text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Daily Practice Sets &nbsp;•&nbsp; Topic-wise Tests &nbsp;•&nbsp; Timed Mock Exams
              <br />
              <span className="text-white/60 text-base">Available in Hindi & English</span>
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {latestTest && (
                <Link
                  href={`/tre4/${latestTest.slug}/instructions`}
                  className="btn bg-white text-brand-700 hover:bg-brand-50 font-bold shadow-card-lg px-8 py-3.5 text-base"
                >
                  Start Today&apos;s Test →
                </Link>
              )}
              <Link
                href="/tre4/topics"
                className="btn bg-white/10 text-white border border-white/25 hover:bg-white/20 px-8 py-3.5 text-base"
              >
                Browse Topics
              </Link>
            </div>
          </MotionSection>
        </div>
      </section>

      {/* ─── Today's test ──────────────────────────────────────────────────── */}
      {latestTest && (
        <section className="container py-12">
          <MotionSection>
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Today&apos;s Test</h2>
            <div className="card-hover p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-card">
                📜
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-1">
                  <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">{latestTest.subject}</span>
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{latestTest.difficulty}</span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{latestTest.date}</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">{latestTest.title}</h3>
                <p className="text-slate-500 mt-0.5">{latestTest.titleHi}</p>
                <div className="flex gap-3 mt-2 text-sm text-slate-500">
                  <span>📝 {latestTest.config.totalQuestions} Questions</span>
                  <span>⏱ {latestTest.config.durationMinutes} Minutes</span>
                  <span>🌐 Hindi & English</span>
                </div>
              </div>
              <Link href={`/tre4/${latestTest.slug}/instructions`} className="btn-primary text-base px-7 py-3 whitespace-nowrap shadow-card">
                Start Test →
              </Link>
            </div>
          </MotionSection>
        </section>
      )}

      {/* ─── Subject cards ──────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-14">
        <div className="container">
          <MotionSection>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Topic-wise Practice</h2>
            <p className="text-slate-500 mb-8">Choose your subject and practise at your own pace.</p>
          </MotionSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tre4TopicGroups.map((group, i) => (
              <MotionSection key={group.id} delay={i * 0.05}>
                <Link href="/tre4/topics" className="card-hover p-5 flex flex-col items-center text-center h-full">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${group.color} flex items-center justify-center text-white font-extrabold text-xl shadow-card mb-3`}
                  >
                    {group.label[0]}
                  </div>
                  <div className="font-bold text-slate-800">{group.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{group.labelHi}</div>
                </Link>
              </MotionSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Daily tests list preview ────────────────────────────────────────── */}
      <section className="container py-14">
        <MotionSection>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Previous Tests</h2>
            <Link href="/tre4/daily" className="text-sm font-semibold text-brand-600 hover:text-brand-800">
              All Tests →
            </Link>
          </div>
        </MotionSection>

        <div className="flex flex-col gap-3">
          {[...tre4Tests]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map((test, i) => (
              <MotionSection key={test.id} delay={i * 0.07}>
                <div className="card-hover p-4 flex items-center gap-4">
                  <div className="text-xs text-slate-400 shrink-0 w-20">
                    {new Date(test.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{test.title}</div>
                    <div className="text-xs text-slate-500">{test.config.totalQuestions}Q • {test.config.durationMinutes} min • {test.difficulty}</div>
                  </div>
                  <Link href={`/tre4/${test.slug}/instructions`} className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap shrink-0">
                    Start
                  </Link>
                </div>
              </MotionSection>
            ))}
        </div>
      </section>

      {/* ─── Journey ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-50 to-purple-50 py-14">
        <div className="container">
          <MotionSection>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Your Learning Journey</h2>
          </MotionSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
            {[
              { icon: '📝', step: '1', title: 'Practice', desc: 'Take daily & topic tests' },
              { icon: '📊', step: '2', title: 'Analyse', desc: 'Review score & topic gaps' },
              { icon: '🔄', step: '3', title: 'Revise', desc: 'Save & revisit weak areas' },
              { icon: '🏆', step: '4', title: 'Improve', desc: 'Track progress over time' },
            ].map((item, i) => (
              <MotionSection key={item.step} delay={i * 0.1}>
                <div className="card p-5 text-center">
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <div className="h-7 w-7 bg-brand-600 text-white rounded-full text-xs font-bold flex items-center justify-center mx-auto mb-2">
                    {item.step}
                  </div>
                  <div className="font-bold text-slate-900">{item.title}</div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </MotionSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────────── */}
      <section className="container py-14">
        <MotionSection>
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Why Practice Here?</h2>
        </MotionSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: '🌐', title: 'Hindi + English', desc: 'Every test is fully bilingual. Switch anytime without resetting your session.' },
            { icon: '⏱', title: 'Real Exam Timer', desc: 'Timer persists through page refresh — exactly like BPSC\'s actual CBT system.' },
            { icon: '📊', title: 'Detailed Results', desc: 'Score, accuracy, topic-wise breakdown and category analysis after every test.' },
            { icon: '🔄', title: 'Wrong Answer Revision', desc: 'Review every mistake with explanation. Save questions for later revision.' },
            { icon: '🗂', title: 'Topic Analysis', desc: 'Identify your weakest areas with clear performance breakdowns.' },
            { icon: '📱', title: 'Mobile Friendly', desc: 'Optimised for phones. Full exam experience on any screen size.' },
          ].map((f, i) => (
            <MotionSection key={f.title} delay={i * 0.06}>
              <div className="card-hover p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <div className="font-bold text-slate-900 text-base">{f.title}</div>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            </MotionSection>
          ))}
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-brand-600 to-purple-700 py-14 text-white text-center">
        <MotionSection>
          <h2 className="text-3xl font-extrabold mb-3">Ready to Start?</h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto">
            Take today&apos;s test right now — no login, no signup required.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {latestTest && (
              <Link href={`/tre4/${latestTest.slug}/instructions`} className="btn bg-white text-brand-700 hover:bg-brand-50 font-bold px-8 py-3 shadow-card-lg">
                Start Today&apos;s Test →
              </Link>
            )}
            <Link href="/tre4/topics" className="btn bg-white/15 text-white border border-white/30 hover:bg-white/25 px-8 py-3">
              Browse All Topics
            </Link>
          </div>
        </MotionSection>
      </section>
    </div>
  );
}
