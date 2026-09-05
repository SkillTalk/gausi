/**
 * Tests for Phase 1 SEO fixes
 *
 * Covers:
 *  A. Sitemap — no history, no fragments, no revision, static tests included,
 *     DB-published tests included, deduplication, failure-safe (DB error → static only)
 *  B. instructions/page generateMetadata — known slug, unknown slug, DB failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Constants used inside mock factories (must be plain literals) ─────────────
const STATIC_SLUG = '2026-08-19-1857';
const DB_SLUG = 'db-test-gausi-history-01';

// vi.mock factories are hoisted to the top of the file by Vitest.
// To let factories reference local variables without temporal dead-zone errors
// we use vi.hoisted() so the values are available at hoist time.
const { hoistedStaticTests, hoistedDbTests, hoistedGetPublished, hoistedGetTestBySlug } =
  vi.hoisted(() => {
    const staticTests = [
      {
        id: `tre4-2026-08-19-1857`,
        slug: '2026-08-19-1857',
        date: '2026-08-19',
        title: '1857 Revolt MCQ Test',
        titleHi: '1857 का विद्रोह',
        subject: 'History',
        subjectHi: 'इतिहास',
        topicId: 'history-revolt-1857',
        difficulty: 'Beginner' as const,
        config: {
          examId: 'bpsc-tre4',
          examName: 'BPSC TRE 4',
          totalQuestions: 25,
          durationMinutes: 20,
          marks: { correct: 1, wrong: -(1 / 3), optionE: 0, unanswered: 0 },
        },
        questions: [],
        description: '25 questions on the 1857 revolt.',
      },
    ];

    const dbTests = [
      {
        id: 'db-001',
        slug: 'db-test-gausi-history-01',
        date: '2026-09-01',
        title: 'Congress History Test',
        titleHi: 'कांग्रेस इतिहास',
        subject: 'History',
        topicId: 'history-inc',
        difficulty: 'Intermediate' as const,
        totalQuestions: 30,
        durationMinutes: 25,
        publishedAt: '2026-09-01T10:00:00.000Z',
      },
    ];

    const getPublished = vi.fn().mockResolvedValue(dbTests);
    const getBySlug = vi.fn().mockResolvedValue(null);

    return {
      hoistedStaticTests: staticTests,
      hoistedDbTests: dbTests,
      hoistedGetPublished: getPublished,
      hoistedGetTestBySlug: getBySlug,
    };
  });

vi.mock('@/content/exams/tre4/tests', () => ({
  tre4Tests: hoistedStaticTests,
}));

vi.mock('@/lib/test-provider', () => ({
  getPublishedDbTests: hoistedGetPublished,
  getTestBySlug: hoistedGetTestBySlug,
}));

vi.mock('@/content/site', () => ({
  siteConfig: { url: 'https://gausidigital.com' },
}));

import sitemap from '@/app/sitemap';
import { buildInstructionsMetadata } from '@/app/tre4/[testSlug]/instructions/_metadata';

beforeEach(() => {
  hoistedGetPublished.mockReset();
  hoistedGetPublished.mockResolvedValue(hoistedDbTests);
  hoistedGetTestBySlug.mockReset();
  hoistedGetTestBySlug.mockResolvedValue(null);
});

// ── A. SITEMAP ────────────────────────────────────────────────────────────────

describe('Sitemap', () => {
  it('includes the homepage', async () => {
    const urls = (await sitemap()).map((r) => r.url);
    expect(urls).toContain('https://gausidigital.com/');
  });

  it('includes /tre4, /tre4/daily, /tre4/topics', async () => {
    const urls = (await sitemap()).map((r) => r.url);
    expect(urls).toContain('https://gausidigital.com/tre4');
    expect(urls).toContain('https://gausidigital.com/tre4/daily');
    expect(urls).toContain('https://gausidigital.com/tre4/topics');
  });

  it('includes /privacy and /terms', async () => {
    const urls = (await sitemap()).map((r) => r.url);
    expect(urls).toContain('https://gausidigital.com/privacy');
    expect(urls).toContain('https://gausidigital.com/terms');
  });

  it('does NOT include /tre4/history', async () => {
    const urls = (await sitemap()).map((r) => r.url);
    expect(urls).not.toContain('https://gausidigital.com/tre4/history');
  });

  it('does NOT include /tre4/revision', async () => {
    const urls = (await sitemap()).map((r) => r.url);
    expect(urls.some((u) => u.includes('/revision'))).toBe(false);
  });

  it('does NOT contain any # fragment URLs', async () => {
    const urls = (await sitemap()).map((r) => r.url);
    expect(urls.some((u) => u.includes('#'))).toBe(false);
  });

  it('includes static test instruction URLs', async () => {
    const urls = (await sitemap()).map((r) => r.url);
    expect(urls).toContain(
      `https://gausidigital.com/tre4/${STATIC_SLUG}/instructions`,
    );
  });

  it('includes DB-published test instruction URLs', async () => {
    const urls = (await sitemap()).map((r) => r.url);
    expect(urls).toContain(
      `https://gausidigital.com/tre4/${DB_SLUG}/instructions`,
    );
  });

  it('deduplicates when a DB slug matches a static slug', async () => {
    hoistedGetPublished.mockResolvedValueOnce([
      { ...hoistedDbTests[0], slug: STATIC_SLUG }, // same slug as static test
    ]);
    const routes = await sitemap();
    const matchingUrls = routes
      .map((r) => r.url)
      .filter((u) => u.includes(STATIC_SLUG));
    expect(matchingUrls).toHaveLength(1);
  });

  it('still returns static routes when DB throws', async () => {
    hoistedGetPublished.mockRejectedValueOnce(new Error('DB down'));
    const routes = await sitemap();
    const urls = routes.map((r) => r.url);
    expect(urls).toContain('https://gausidigital.com/');
    expect(urls).toContain(
      `https://gausidigital.com/tre4/${STATIC_SLUG}/instructions`,
    );
    expect(urls.some((u) => u.includes(DB_SLUG))).toBe(false);
  });

  it('uses test.date as lastModified for static tests', async () => {
    const routes = await sitemap();
    const entry = routes.find((r) => r.url.includes(`${STATIC_SLUG}/instructions`));
    expect(entry?.lastModified).toBe('2026-08-19');
  });

  it('uses publishedAt as lastModified for DB tests', async () => {
    const routes = await sitemap();
    const entry = routes.find((r) => r.url.includes(DB_SLUG));
    expect(entry?.lastModified).toBe('2026-09-01T10:00:00.000Z');
  });
});

// ── B. instructions/page generateMetadata ────────────────────────────────────

describe('instructions/page generateMetadata', () => {
  it('returns test-specific title when slug is found', async () => {
    hoistedGetTestBySlug.mockResolvedValueOnce(hoistedStaticTests[0]);
    const meta = await buildInstructionsMetadata( STATIC_SLUG );
    expect((meta as { title?: string }).title).toContain('1857 Revolt MCQ Test');
  });

  it('includes "BPSC TRE 4 Practice Test" in the title', async () => {
    hoistedGetTestBySlug.mockResolvedValueOnce(hoistedStaticTests[0]);
    const meta = await buildInstructionsMetadata( STATIC_SLUG );
    expect((meta as { title?: string }).title).toContain('BPSC TRE 4 Practice Test');
  });

  it('sets canonical URL to /tre4/[slug]/instructions', async () => {
    hoistedGetTestBySlug.mockResolvedValueOnce(hoistedStaticTests[0]);
    const meta = await buildInstructionsMetadata( STATIC_SLUG );
    const canonical = (meta as { alternates?: { canonical?: string } }).alternates?.canonical;
    expect(canonical).toBe(`/tre4/${STATIC_SLUG}/instructions`);
  });

  it('uses test.description when present', async () => {
    hoistedGetTestBySlug.mockResolvedValueOnce(hoistedStaticTests[0]);
    const meta = await buildInstructionsMetadata( STATIC_SLUG );
    expect((meta as { description?: string }).description).toBe(
      '25 questions on the 1857 revolt.',
    );
  });

  it('generates a fallback description when test.description is absent', async () => {
    const testWithoutDesc = { ...hoistedStaticTests[0], description: undefined };
    hoistedGetTestBySlug.mockResolvedValueOnce(testWithoutDesc);
    const meta = await buildInstructionsMetadata( STATIC_SLUG );
    const desc = (meta as { description?: string }).description ?? '';
    expect(desc).toContain('25');
    expect(desc).toContain('History');
  });

  it('returns {} for an unknown slug', async () => {
    hoistedGetTestBySlug.mockResolvedValueOnce(null);
    const meta = await buildInstructionsMetadata( 'unknown-slug' );
    expect(meta).toEqual({});
  });

  it('returns {} when getTestBySlug throws (DB failure)', async () => {
    hoistedGetTestBySlug.mockRejectedValueOnce(new Error('DB error'));
    const meta = await buildInstructionsMetadata( STATIC_SLUG );
    expect(meta).toEqual({});
  });
});
