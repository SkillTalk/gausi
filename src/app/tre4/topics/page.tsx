import type { Metadata } from 'next';
import Link from 'next/link';
import { tre4TopicGroups } from '@/content/exams/tre4/topics';
import { tre4Tests } from '@/content/exams/tre4/tests';

export const metadata: Metadata = {
  title: 'Topic-wise Practice — BPSC TRE 4',
  description: 'Practice BPSC TRE 4 topic-wise: History, Geography, Science, Mathematics and more in Hindi & English.',
};

export default function TopicsPage() {
  // Map topicId → first available test slug
  const topicTestMap: Record<string, string> = {};
  for (const t of tre4Tests) {
    if (!topicTestMap[t.topicId]) topicTestMap[t.topicId] = t.slug;
  }

  return (
    <div className="min-h-screen bg-exam-bg">
      <div className="container py-10 md:py-14">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tre4" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4">
            ← BPSC TRE 4
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900">Topic-wise Practice</h1>
          <p className="text-slate-500 mt-2">Choose a subject and topic to start practising.</p>
        </div>

        {/* Subject groups */}
        <div className="flex flex-col gap-10">
          {tre4TopicGroups.map((group) => (
            <section key={group.id}>
              {/* Subject header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`h-2 w-2 rounded-full bg-gradient-to-r ${group.color}`}
                />
                <h2 className="text-xl font-bold text-slate-900">
                  {group.label}
                  <span className="ml-2 text-slate-400 font-normal text-base">/ {group.labelHi}</span>
                </h2>
              </div>

              {/* Topic cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.topics.map((topic) => {
                  const testSlug = topicTestMap[topic.id];
                  const isAvailable = topic.available && Boolean(testSlug);

                  return (
                    <div
                      key={topic.id}
                      className={`card p-5 transition-all duration-200 ${
                        isAvailable
                          ? 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer'
                          : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{topic.label}</h3>
                          <p className="text-sm text-slate-500 mt-0.5">{topic.labelHi}</p>
                        </div>
                        {isAvailable ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            Available
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            Coming Soon
                          </span>
                        )}
                      </div>

                      {isAvailable && testSlug ? (
                        <Link
                          href={`/tre4/${testSlug}/instructions`}
                          className="btn-primary w-full text-sm mt-4 text-center block"
                        >
                          Start Practice
                        </Link>
                      ) : (
                        <div className="mt-4 text-xs text-slate-400 text-center py-2">
                          Test coming soon
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
