import type { Metadata } from 'next';
import Link from 'next/link';
import { tre4TopicGroups } from '@/content/exams/tre4/topics';
import { tre4Tests } from '@/content/exams/tre4/tests';
import { getPublishedDbTests } from '@/lib/test-provider';
import { getDbTestsForGroup, buildStaticSlugSet, type DbTopicTest } from '@/lib/topics-merge';

// Always server-render so DB tests appear without a stale cache.
export const dynamic = 'force-dynamic';

// Set of valid category IDs (group.id values) for quick lookup.
const VALID_CATEGORY_IDS = new Set(tre4TopicGroups.map((g) => g.id));

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const categoryId = params.category?.trim() ?? '';
  const group = VALID_CATEGORY_IDS.has(categoryId)
    ? tre4TopicGroups.find((g) => g.id === categoryId)
    : null;

  if (group) {
    return {
      title: `${group.label} Practice — BPSC TRE 4`,
      description: `Practice BPSC TRE 4 ${group.label} topic-wise MCQs in Hindi & English.`,
    };
  }
  return {
    title: 'Topic-wise Practice — BPSC TRE 4',
    description:
      'Practice BPSC TRE 4 topic-wise: History, Geography, Science, Mathematics and more in Hindi & English.',
  };
}

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const categoryId = params.category?.trim() ?? '';

  // Resolve which group(s) to display.
  // Valid category → show only that group.
  // Invalid or absent → show all groups.
  const filteredGroup = VALID_CATEGORY_IDS.has(categoryId)
    ? tre4TopicGroups.find((g) => g.id === categoryId) ?? null
    : null;
  const visibleGroups = filteredGroup ? [filteredGroup] : tre4TopicGroups;
  const isFiltered = filteredGroup !== null;

  // ── Static: map topicId → first static test slug ─────────────────────────
  const topicTestMap: Record<string, string> = {};
  for (const t of tre4Tests) {
    if (!topicTestMap[t.topicId]) topicTestMap[t.topicId] = t.slug;
  }

  // Slugs already shown by static topic cards — used to deduplicate DB tests.
  const staticSlugs = buildStaticSlugSet(tre4Tests);

  // ── DB: fetch all PUBLISHED tests for this exam ──────────────────────────
  let dbTests: DbTopicTest[] = [];
  try {
    const rows = await getPublishedDbTests({ exam: 'BPSC TRE 4' });
    dbTests = rows.map((r) => ({
      slug: r.slug,
      category: r.subject, // getPublishedDbTests maps DB `category` → `subject`
      title: r.title,
      titleHi: r.titleHi,
      topicId: r.topicId,
    }));
  } catch {
    // DB unavailable — topics page degrades gracefully to static-only.
  }

  return (
    <div className="min-h-screen bg-exam-bg">
      <div className="container py-10 md:py-14">
        {/* Header */}
        <div className="mb-8">
          {isFiltered ? (
            /* Filtered: back link → All Subjects */
            <Link
              href="/tre4/topics"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4"
            >
              ← All Subjects
            </Link>
          ) : (
            <Link
              href="/tre4"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4"
            >
              ← BPSC TRE 4
            </Link>
          )}

          {isFiltered && filteredGroup ? (
            <>
              <h1 className="text-3xl font-extrabold text-slate-900">
                {filteredGroup.label} Practice
              </h1>
              <p className="text-slate-500 mt-2">
                Choose a {filteredGroup.label} topic to start practising.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold text-slate-900">Topic-wise Practice</h1>
              <p className="text-slate-500 mt-2">Choose a subject and topic to start practising.</p>
            </>
          )}
        </div>

        {/* Subject groups */}
        <div className="flex flex-col gap-10">
          {visibleGroups.map((group) => {
            // DB tests for this group that are not already shown by a static card
            const groupDbCategory = group.dbCategory ?? group.label;
            const dynamicTests = getDbTestsForGroup(dbTests, groupDbCategory, staticSlugs);

            return (
              <section key={group.id}>
                {/* Subject header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${group.color}`} />
                  <h2 className="text-xl font-bold text-slate-900">
                    {group.label}
                    <span className="ml-2 text-slate-400 font-normal text-base">
                      / {group.labelHi}
                    </span>
                  </h2>
                </div>

                {/* Topic cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* ── Static topic cards (unchanged) ─────────────────────── */}
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

                  {/* ── Dynamic DB-published cards ──────────────────────────── */}
                  {dynamicTests.map((dbTest) => (
                    <div
                      key={dbTest.slug}
                      className="card p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{dbTest.title}</h3>
                          <p className="text-sm text-slate-500 mt-0.5">{dbTest.titleHi}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          Available
                        </span>
                      </div>

                      <Link
                        href={`/tre4/${dbTest.slug}/instructions`}
                        className="btn-primary w-full text-sm mt-4 text-center block"
                      >
                        Start Practice
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
