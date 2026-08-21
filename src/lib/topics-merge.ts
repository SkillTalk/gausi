/**
 * Pure merge utility: weaves DB-published tests into the static topic groups.
 *
 * This is kept as a pure function with no DB or Next.js imports so it can be
 * unit-tested without any runtime environment.
 *
 * Algorithm:
 *  - Static topic cards are always shown as-is.
 *    Available = topic.available && the static test registry has a slug for it.
 *  - DB-published tests that are not already represented by a static test slug
 *    (deduplicated by slug) surface as new dynamic cards in the matching group.
 *  - Only PUBLISHED tests should be passed in; the filter is the caller's
 *    responsibility (getPublishedDbTests always returns PUBLISHED rows).
 */

/** Minimal shape of a DB-published test used by the topics page. */
export type DbTopicTest = {
  /** DB-derived slug, e.g. '2026-08-21-history-inc-1885-congress-ki-sthapna-72ak' */
  slug: string;
  /** Canonical DB category string, e.g. 'History', 'General Science' */
  category: string;
  /** English title */
  title: string;
  /** Hindi title */
  titleHi: string;
  /** topicId derived from the topic string via toTopicId() */
  topicId: string;
};

/**
 * Given the full list of DB-published tests and the set of slugs already
 * covered by static tests, return the subset of DB tests that should be
 * shown as new dynamic topic cards for a given dbCategory.
 *
 * A DB test is suppressed when:
 *  - Its slug is already in staticSlugs (it IS a static test, or there's a
 *    DB-backed duplicate of a slug already shown).
 *
 * @param allDbTests   All DB tests for this exam (status=PUBLISHED).
 * @param dbCategory   The canonical DB category to filter for this group.
 * @param staticSlugs  Set of slugs already rendered by static topic cards.
 */
export function getDbTestsForGroup(
  allDbTests: DbTopicTest[],
  dbCategory: string,
  staticSlugs: ReadonlySet<string>,
): DbTopicTest[] {
  return allDbTests.filter(
    (t) => t.category === dbCategory && !staticSlugs.has(t.slug),
  );
}

/**
 * Build the set of all static test slugs from the static test registry.
 * Used as the deduplication key when filtering DB tests.
 */
export function buildStaticSlugSet(
  staticTests: ReadonlyArray<{ slug: string }>,
): Set<string> {
  return new Set(staticTests.map((t) => t.slug));
}
