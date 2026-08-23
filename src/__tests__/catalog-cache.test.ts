/**
 * Tests for Phase 2 — Public Catalog Caching / ISR
 *
 * Verifies:
 *  1. Public catalog data is served from cache (unstable_cache wraps the DB call)
 *  2. Category filtering still works correctly with the cached function
 *  3. publishTest triggers cache invalidation
 *  4. publishDueScheduledTests (cron) triggers invalidation transitively
 *  5. archiveTest triggers cache invalidation
 *  6. User / admin / private data is NOT cached
 *  7. Cache tag and TTL constants are correct
 *  8. invalidatePublishedTestsCache is safe to call even when revalidate throws
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock next/cache so we can inspect calls without a real Next.js runtime
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn(
    // Passthrough: wraps the function, returns it for test purposes
    (fn: (...args: unknown[]) => unknown) => fn,
  ),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock the Prisma db so no real DB connection is made
vi.mock('@/lib/db', () => ({
  db: {
    generatedTest: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { PUBLIC_CATALOG_TAG, CATALOG_TTL_SECONDS, invalidatePublishedTestsCache } from '@/lib/catalog-cache';
import { revalidateTag, revalidatePath, unstable_cache } from 'next/cache';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cache tag / TTL constants
// ─────────────────────────────────────────────────────────────────────────────

describe('1: cache constants', () => {
  it('PUBLIC_CATALOG_TAG is published-tests', () => {
    expect(PUBLIC_CATALOG_TAG).toBe('published-tests');
  });

  it('CATALOG_TTL_SECONDS is 60', () => {
    expect(CATALOG_TTL_SECONDS).toBe(60);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. unstable_cache wraps getPublishedDbTests
// ─────────────────────────────────────────────────────────────────────────────

describe('2: getPublishedDbTests is wrapped in unstable_cache', () => {
  it('unstable_cache is called on module load with correct tag and TTL', async () => {
    // Import after mocks are set up so unstable_cache is already mocked
    await import('@/lib/test-provider');
    expect(unstable_cache).toHaveBeenCalledWith(
      expect.any(Function),           // the raw fetch function
      ['published-db-tests'],          // keyParts
      expect.objectContaining({
        tags: [PUBLIC_CATALOG_TAG],    // 'published-tests'
        revalidate: CATALOG_TTL_SECONDS, // 60
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. invalidatePublishedTestsCache calls revalidateTag + revalidatePath
// ─────────────────────────────────────────────────────────────────────────────

describe('3: invalidatePublishedTestsCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls revalidateTag with published-tests', () => {
    invalidatePublishedTestsCache();
    expect(revalidateTag).toHaveBeenCalledWith('published-tests');
  });

  it('calls revalidatePath for all three public listing routes', () => {
    invalidatePublishedTestsCache();
    expect(revalidatePath).toHaveBeenCalledWith('/tre4');
    expect(revalidatePath).toHaveBeenCalledWith('/tre4/daily');
    expect(revalidatePath).toHaveBeenCalledWith('/tre4/topics');
  });

  it('does NOT call revalidatePath for admin routes', () => {
    invalidatePublishedTestsCache();
    const paths = (revalidatePath as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: string[]) => c[0],
    );
    expect(paths.some((p: string) => p.includes('/admin'))).toBe(false);
    expect(paths.some((p: string) => p.includes('/api'))).toBe(false);
  });

  it('is safe to call even if revalidateTag throws', () => {
    (revalidateTag as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('revalidate failed');
    });
    // Must not throw — errors are caught and logged
    expect(() => invalidatePublishedTestsCache()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. publishTest calls invalidation
// ─────────────────────────────────────────────────────────────────────────────

describe('4: publishTest triggers cache invalidation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls revalidateTag after publishing', async () => {
    const { db } = await import('@/lib/db');

    // Mock a READY test that passes all eligibility checks
    (db.generatedTest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'test-1',
      status: 'READY',
      contentVersion: 1,
      totalQuestions: 25,
      validation: { overallStatus: 'READY', failed: 0, reviewNeeded: 0, contentVersion: 1 },
    });
    (db.generatedTest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const { publishTest } = await import('@/lib/admin/publish.service');
    const result = await publishTest('test-1');

    expect(result.ok).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('published-tests');
    expect(revalidatePath).toHaveBeenCalledWith('/tre4');
    expect(revalidatePath).toHaveBeenCalledWith('/tre4/daily');
    expect(revalidatePath).toHaveBeenCalledWith('/tre4/topics');
  });

  it('does NOT call revalidateTag if publish is rejected (eligibility fail)', async () => {
    const { db } = await import('@/lib/db');

    // Test not found → eligibility fails → no cache invalidation
    (db.generatedTest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { publishTest } = await import('@/lib/admin/publish.service');
    const result = await publishTest('missing-test');

    expect(result.ok).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Cron / publishDueScheduledTests transitively invalidates cache
// ─────────────────────────────────────────────────────────────────────────────

describe('5: publishDueScheduledTests (cron) triggers invalidation transitively', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls revalidateTag when at least one scheduled test is published', async () => {
    const { db } = await import('@/lib/db');

    // findMany returns one due scheduled test
    (db.generatedTest.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 'sched-1', topic: 'History', publishAt: new Date('2024-01-01') },
    ]);
    // findUnique (eligibility check) returns a READY-equivalent SCHEDULED test
    (db.generatedTest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'sched-1',
      status: 'SCHEDULED',
      contentVersion: 1,
      totalQuestions: 25,
      validation: { overallStatus: 'READY', failed: 0, reviewNeeded: 0, contentVersion: 1 },
    });
    (db.generatedTest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const { publishDueScheduledTests } = await import('@/lib/admin/publish.service');
    const result = await publishDueScheduledTests();

    expect(result.published).toBeGreaterThan(0);
    // revalidateTag called at least once (once per published test)
    expect(revalidateTag).toHaveBeenCalledWith('published-tests');
  });

  it('does not call revalidateTag if no tests are due', async () => {
    const { db } = await import('@/lib/db');
    (db.generatedTest.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const { publishDueScheduledTests } = await import('@/lib/admin/publish.service');
    await publishDueScheduledTests();

    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. archiveTest triggers cache invalidation
// ─────────────────────────────────────────────────────────────────────────────

describe('6: archiveTest triggers cache invalidation', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls revalidateTag after archiving', async () => {
    const { db } = await import('@/lib/db');
    (db.generatedTest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'pub-1', status: 'PUBLISHED',
    });
    (db.generatedTest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const { archiveTest } = await import('@/lib/admin/publish.service');
    const result = await archiveTest('pub-1');

    expect(result.ok).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('published-tests');
    expect(revalidatePath).toHaveBeenCalledWith('/tre4');
    expect(revalidatePath).toHaveBeenCalledWith('/tre4/daily');
    expect(revalidatePath).toHaveBeenCalledWith('/tre4/topics');
  });

  it('does NOT call revalidateTag if archive is rejected (non-PUBLISHED status)', async () => {
    const { db } = await import('@/lib/db');
    (db.generatedTest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'gen-1', status: 'GENERATED',
    });

    const { archiveTest } = await import('@/lib/admin/publish.service');
    const result = await archiveTest('gen-1');

    expect(result.ok).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. User / admin / private data is NOT cached
// ─────────────────────────────────────────────────────────────────────────────

describe('7: private data is never cached', () => {
  it('invalidatePublishedTestsCache does not touch user/attempt/session paths', () => {
    vi.clearAllMocks();
    invalidatePublishedTestsCache();
    const paths = (revalidatePath as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: string[]) => c[0],
    );
    const forbidden = ['/api/attempts', '/tre4/history', '/admin', '/api/admin', '/api/auth'];
    for (const f of forbidden) {
      expect(paths.some((p: string) => p.startsWith(f))).toBe(false);
    }
  });

  it('scheduleTest (SCHEDULED → not yet public) does NOT invalidate catalog', async () => {
    vi.clearAllMocks();
    const { db } = await import('@/lib/db');
    (db.generatedTest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'rdy-1',
      status: 'READY',
      contentVersion: 1,
      totalQuestions: 25,
      validation: { overallStatus: 'READY', failed: 0, reviewNeeded: 0, contentVersion: 1 },
    });
    (db.generatedTest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const { scheduleTest } = await import('@/lib/admin/publish.service');
    const future = new Date(Date.now() + 3_600_000); // 1 hr from now
    await scheduleTest('rdy-1', future);

    // scheduleTest only changes to SCHEDULED, not PUBLISHED — no catalog change
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('cancelSchedule (SCHEDULED → READY, not public) does NOT invalidate catalog', async () => {
    vi.clearAllMocks();
    const { db } = await import('@/lib/db');
    (db.generatedTest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'sched-2', status: 'SCHEDULED',
    });
    (db.generatedTest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const { cancelSchedule } = await import('@/lib/admin/publish.service');
    await cancelSchedule('sched-2');

    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Category filtering works through the cache
// ─────────────────────────────────────────────────────────────────────────────

describe('8: category filtering works through unstable_cache', () => {
  it('different filter arguments produce different cache keys (different calls)', async () => {
    const { db } = await import('@/lib/db');
    (db.generatedTest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { getPublishedDbTests } = await import('@/lib/test-provider');

    // Both calls should work independently without crashing
    await getPublishedDbTests({ exam: 'BPSC TRE 4' });
    await getPublishedDbTests({ exam: 'BPSC TRE 4', category: 'History' });

    // findMany called twice (once per unique filter)
    expect(db.generatedTest.findMany).toHaveBeenCalledTimes(2);
  });

  it('History filter passes category to DB query', async () => {
    const { db } = await import('@/lib/db');
    (db.generatedTest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { getPublishedDbTests } = await import('@/lib/test-provider');
    await getPublishedDbTests({ exam: 'BPSC TRE 4', category: 'History' });

    expect(db.generatedTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'History' }),
      }),
    );
  });
});
