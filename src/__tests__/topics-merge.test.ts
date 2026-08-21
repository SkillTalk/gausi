/**
 * Unit tests for the topics-merge utility.
 *
 * Covers:
 *  1. PUBLISHED History DB test appears under History
 *  2. PUBLISHED Geography test appears only under Geography
 *  3. READY / SCHEDULED / ARCHIVED tests do NOT appear (caller's responsibility;
 *     we test that non-matching category is excluded)
 *  4. Existing Revolt of 1857 static slug is deduplicated
 *  5. Clicking dynamic topic test resolves correct slug
 *  6. Static/DB duplicate by slug does not create duplicate cards
 *  7. Category mapping works (label vs dbCategory)
 *  8. buildStaticSlugSet handles empty array
 *  9. Multiple DB tests for the same category all surface
 * 10. No regression: empty DB test list returns empty dynamic cards
 */
import { describe, it, expect } from 'vitest';
import { getDbTestsForGroup, buildStaticSlugSet, type DbTopicTest } from '@/lib/topics-merge';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STATIC_TESTS = [
  { slug: '2026-08-19-1857', topicId: 'revolt-1857' }, // static Revolt of 1857
] as const;

function makeDbTest(overrides: Partial<DbTopicTest> & { slug: string; category: string }): DbTopicTest {
  return {
    title: 'Test Title',
    titleHi: 'टेस्ट शीर्षक',
    topicId: 'some-topic',
    ...overrides,
  };
}

const INC_TEST = makeDbTest({
  slug: '2026-08-21-history-inc-1885-congress-ki-sthapna-72ak',
  category: 'History',
  title: 'Establishment of Indian National Congress',
  titleHi: 'भारतीय राष्ट्रीय कांग्रेस की स्थापना',
  topicId: 'inc-1885-congress-ki-sthapna',
});

const GEO_TEST = makeDbTest({
  slug: '2026-08-22-geography-indian-rivers-abc1',
  category: 'Geography',
  title: 'Indian Rivers',
  titleHi: 'भारतीय नदियाँ',
  topicId: 'indian-rivers',
});

const SECOND_HISTORY_TEST = makeDbTest({
  slug: '2026-08-23-history-ancient-india-xyz2',
  category: 'History',
  title: 'Ancient India',
  titleHi: 'प्राचीन भारत',
  topicId: 'ancient-india',
});

// ─── buildStaticSlugSet ───────────────────────────────────────────────────────

describe('buildStaticSlugSet', () => {
  it('builds a set from static test slugs', () => {
    const set = buildStaticSlugSet(STATIC_TESTS);
    expect(set.has('2026-08-19-1857')).toBe(true);
    expect(set.size).toBe(1);
  });

  it('returns empty set for empty array', () => {
    const set = buildStaticSlugSet([]);
    expect(set.size).toBe(0);
  });

  it('handles multiple static tests', () => {
    const set = buildStaticSlugSet([
      { slug: 'slug-a' },
      { slug: 'slug-b' },
      { slug: 'slug-c' },
    ]);
    expect(set.size).toBe(3);
    expect(set.has('slug-b')).toBe(true);
  });
});

// ─── getDbTestsForGroup ───────────────────────────────────────────────────────

describe('getDbTestsForGroup', () => {
  const staticSlugs = buildStaticSlugSet(STATIC_TESTS);

  // Test 1: PUBLISHED History DB test appears under History
  it('returns History DB test for the History group', () => {
    const result = getDbTestsForGroup([INC_TEST], 'History', staticSlugs);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe(INC_TEST.slug);
    expect(result[0].title).toBe('Establishment of Indian National Congress');
  });

  // Test 2: PUBLISHED Geography test appears only under Geography, not History
  it('returns Geography test only for Geography group, not History', () => {
    const allTests = [INC_TEST, GEO_TEST];

    const historyResult = getDbTestsForGroup(allTests, 'History', staticSlugs);
    expect(historyResult).toHaveLength(1);
    expect(historyResult[0].slug).toBe(INC_TEST.slug);

    const geoResult = getDbTestsForGroup(allTests, 'Geography', staticSlugs);
    expect(geoResult).toHaveLength(1);
    expect(geoResult[0].slug).toBe(GEO_TEST.slug);
  });

  // Test 3: Category not matching returns nothing (simulates READY/ARCHIVED being
  //         excluded from the DB fetch — those are filtered by the caller)
  it('returns empty array when no tests match dbCategory', () => {
    const result = getDbTestsForGroup([INC_TEST], 'General Science', staticSlugs);
    expect(result).toHaveLength(0);
  });

  // Test 4: Revolt of 1857 static slug is deduplicated
  it('excludes DB test whose slug is already in staticSlugs', () => {
    // Simulate a DB test that shares a slug with the static Revolt of 1857 test
    const dupTest = makeDbTest({
      slug: '2026-08-19-1857', // same slug as the static test
      category: 'History',
      title: 'Revolt of 1857 (DB)',
      titleHi: '1857 का विद्रोह (DB)',
      topicId: 'revolt-1857',
    });
    const result = getDbTestsForGroup([dupTest], 'History', staticSlugs);
    expect(result).toHaveLength(0); // suppressed — already shown by static card
  });

  // Test 5: Resolves the correct slug for the dynamic test
  it('dynamic card carries the correct slug for the instructions link', () => {
    const result = getDbTestsForGroup([INC_TEST], 'History', staticSlugs);
    expect(result[0].slug).toBe('2026-08-21-history-inc-1885-congress-ki-sthapna-72ak');
  });

  // Test 6: Static/DB duplicate by slug does not create duplicate cards
  it('multiple DB tests: only the non-duplicate appears', () => {
    const dupTest = makeDbTest({
      slug: '2026-08-19-1857', // static slug
      category: 'History',
      topicId: 'revolt-1857',
    });
    const result = getDbTestsForGroup([dupTest, INC_TEST], 'History', staticSlugs);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe(INC_TEST.slug);
  });

  // Test 7: dbCategory label mapping — 'General Science' differs from 'Science'
  it('respects dbCategory value exactly (Science ≠ General Science)', () => {
    const scienceTest = makeDbTest({
      slug: '2026-08-24-general-science-physics-x1',
      category: 'General Science',
      topicId: 'physics',
    });
    // group.dbCategory = 'General Science' → match
    const result = getDbTestsForGroup([scienceTest], 'General Science', new Set());
    expect(result).toHaveLength(1);
    // group.label = 'Science' (without dbCategory fallback) → no match
    const result2 = getDbTestsForGroup([scienceTest], 'Science', new Set());
    expect(result2).toHaveLength(0);
  });

  // Test 8: No DB tests → empty dynamic cards (no regression to static display)
  it('returns empty array when DB test list is empty', () => {
    const result = getDbTestsForGroup([], 'History', staticSlugs);
    expect(result).toHaveLength(0);
  });

  // Test 9: Multiple DB tests for the same category all surface
  it('returns multiple DB tests for the same category', () => {
    const result = getDbTestsForGroup(
      [INC_TEST, SECOND_HISTORY_TEST],
      'History',
      staticSlugs,
    );
    expect(result).toHaveLength(2);
    const slugs = result.map((t) => t.slug);
    expect(slugs).toContain(INC_TEST.slug);
    expect(slugs).toContain(SECOND_HISTORY_TEST.slug);
  });

  // Test 10: ARCHIVED tests — simulate by passing empty list (caller responsibility)
  //          Verifies that DB tests not in PUBLISHED state won't appear because
  //          getPublishedDbTests only returns PUBLISHED rows.
  it('does not surface tests that were not passed in (caller filters non-PUBLISHED)', () => {
    // Only PUBLISHED tests are passed to getDbTestsForGroup.
    // READY/SCHEDULED/ARCHIVED are excluded upstream by getPublishedDbTests.
    // Here we verify: a test with category='History' only appears when passed in.
    const archivedSimulation: DbTopicTest[] = []; // caller filtered it out
    const result = getDbTestsForGroup(archivedSimulation, 'History', staticSlugs);
    expect(result).toHaveLength(0);
  });
});
