/**
 * Agent 3 — Publish Service Tests
 *
 * All DB interactions are mocked so no real DB is needed.
 * Tests cover publish guards, scheduling, cancel, archive, and cron.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    generatedTest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockFindUnique = db.generatedTest.findUnique as MockedFunction<typeof db.generatedTest.findUnique>;
const mockFindMany = db.generatedTest.findMany as MockedFunction<typeof db.generatedTest.findMany>;
const mockUpdate = db.generatedTest.update as MockedFunction<typeof db.generatedTest.update>;

import {
  checkPublishEligibility,
  publishTest,
  scheduleTest,
  cancelSchedule,
  archiveTest,
  publishDueScheduledTests,
} from '@/lib/admin/publish.service';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTest(overrides: Partial<{
  id: string;
  status: string;
  contentVersion: number;
  totalQuestions: number;
  validation: null | {
    overallStatus: string;
    failed: number;
    reviewNeeded: number;
    contentVersion: number;
  };
}> = {}) {
  return {
    id: 'test-1',
    status: 'READY',
    contentVersion: 1,
    totalQuestions: 10,
    validation: {
      overallStatus: 'READY',
      failed: 0,
      reviewNeeded: 0,
      contentVersion: 1,
    },
    ...overrides,
  };
}

// ─── checkPublishEligibility ──────────────────────────────────────────────────

describe('checkPublishEligibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when test not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await checkPublishEligibility('missing');
    expect(result).toMatchObject({ ok: false, httpStatus: 404 });
  });

  it('rejects GENERATED status', async () => {
    mockFindUnique.mockResolvedValue(makeTest({ status: 'GENERATED' }) as never);
    const result = await checkPublishEligibility('test-1');
    expect(result).toMatchObject({ ok: false, httpStatus: 409 });
  });

  it('rejects VALIDATION_FAILED status', async () => {
    mockFindUnique.mockResolvedValue(makeTest({ status: 'VALIDATION_FAILED' }) as never);
    const result = await checkPublishEligibility('test-1');
    expect(result).toMatchObject({ ok: false, httpStatus: 409 });
  });

  it('rejects when no validation record exists', async () => {
    mockFindUnique.mockResolvedValue(makeTest({ validation: null }) as never);
    const result = await checkPublishEligibility('test-1');
    expect(result).toMatchObject({ ok: false, httpStatus: 422 });
  });

  it('rejects when validation overallStatus is not READY', async () => {
    mockFindUnique.mockResolvedValue(makeTest({
      validation: { overallStatus: 'VALIDATION_FAILED', failed: 3, reviewNeeded: 0, contentVersion: 1 },
    }) as never);
    const result = await checkPublishEligibility('test-1');
    expect(result).toMatchObject({ ok: false, httpStatus: 422 });
  });

  it('rejects when validation has failed questions', async () => {
    mockFindUnique.mockResolvedValue(makeTest({
      validation: { overallStatus: 'READY', failed: 2, reviewNeeded: 0, contentVersion: 1 },
    }) as never);
    const result = await checkPublishEligibility('test-1');
    expect(result).toMatchObject({ ok: false, httpStatus: 422 });
  });

  it('rejects when validation has review-needed questions', async () => {
    mockFindUnique.mockResolvedValue(makeTest({
      validation: { overallStatus: 'READY', failed: 0, reviewNeeded: 1, contentVersion: 1 },
    }) as never);
    const result = await checkPublishEligibility('test-1');
    expect(result).toMatchObject({ ok: false, httpStatus: 422 });
  });

  it('blocks when content version is stale (regenerated after validation)', async () => {
    mockFindUnique.mockResolvedValue(makeTest({
      contentVersion: 3,
      validation: { overallStatus: 'READY', failed: 0, reviewNeeded: 0, contentVersion: 2 },
    }) as never);
    const result = await checkPublishEligibility('test-1');
    expect(result).toMatchObject({ ok: false, httpStatus: 422 });
  });

  it('returns eligible for a fully passing READY test', async () => {
    mockFindUnique.mockResolvedValue(makeTest() as never);
    const result = await checkPublishEligibility('test-1');
    expect(result).toMatchObject({ eligible: true });
  });

  it('returns eligible for a SCHEDULED test with passing validation', async () => {
    mockFindUnique.mockResolvedValue(makeTest({ status: 'SCHEDULED' }) as never);
    const result = await checkPublishEligibility('test-1');
    expect(result).toMatchObject({ eligible: true });
  });
});

// ─── publishTest ──────────────────────────────────────────────────────────────

describe('publishTest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes an eligible READY test', async () => {
    mockFindUnique.mockResolvedValue(makeTest() as never);
    mockUpdate.mockResolvedValue({} as never);

    const result = await publishTest('test-1');
    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      })
    );
  });

  it('fails when eligibility check fails', async () => {
    mockFindUnique.mockResolvedValue(makeTest({ status: 'GENERATED' }) as never);
    const result = await publishTest('test-1');
    expect(result.ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ─── scheduleTest ─────────────────────────────────────────────────────────────

describe('scheduleTest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('schedules a READY test for a future date', async () => {
    mockFindUnique.mockResolvedValue(makeTest() as never);
    mockUpdate.mockResolvedValue({} as never);

    const futureDate = new Date(Date.now() + 60_000 * 60); // 1 hour from now
    const result = await scheduleTest('test-1', futureDate);
    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SCHEDULED', publishAt: futureDate }),
      })
    );
  });

  it('rejects scheduling in the past', async () => {
    const pastDate = new Date(Date.now() - 120_000); // 2 minutes ago
    const result = await scheduleTest('test-1', pastDate);
    expect(result).toMatchObject({ ok: false, httpStatus: 400 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('blocks scheduling of a VALIDATION_FAILED test', async () => {
    mockFindUnique.mockResolvedValue(makeTest({ status: 'VALIDATION_FAILED' }) as never);
    const futureDate = new Date(Date.now() + 60_000 * 60);
    const result = await scheduleTest('test-1', futureDate);
    expect(result).toMatchObject({ ok: false, httpStatus: 409 });
  });
});

// ─── cancelSchedule ──────────────────────────────────────────────────────────

describe('cancelSchedule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancels a SCHEDULED test and reverts to READY', async () => {
    mockFindUnique.mockResolvedValue({ status: 'SCHEDULED' } as never);
    mockUpdate.mockResolvedValue({} as never);

    const result = await cancelSchedule('test-1');
    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'READY', publishAt: null }),
      })
    );
  });

  it('fails if test is not SCHEDULED', async () => {
    mockFindUnique.mockResolvedValue({ status: 'READY' } as never);
    const result = await cancelSchedule('test-1');
    expect(result).toMatchObject({ ok: false, httpStatus: 409 });
  });

  it('returns 404 for missing test', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await cancelSchedule('missing');
    expect(result).toMatchObject({ ok: false, httpStatus: 404 });
  });
});

// ─── archiveTest ─────────────────────────────────────────────────────────────

describe('archiveTest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('archives a PUBLISHED test', async () => {
    mockFindUnique.mockResolvedValue({ status: 'PUBLISHED' } as never);
    mockUpdate.mockResolvedValue({} as never);

    const result = await archiveTest('test-1');
    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ARCHIVED' } })
    );
  });

  it('rejects archiving a READY test', async () => {
    mockFindUnique.mockResolvedValue({ status: 'READY' } as never);
    const result = await archiveTest('test-1');
    expect(result).toMatchObject({ ok: false, httpStatus: 409 });
  });

  it('returns 404 for missing test', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await archiveTest('missing');
    expect(result).toMatchObject({ ok: false, httpStatus: 404 });
  });
});

// ─── publishDueScheduledTests (cron) ─────────────────────────────────────────

describe('publishDueScheduledTests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes all due SCHEDULED tests', async () => {
    const dueTests = [
      { id: 'test-a', topic: 'Topic A', publishAt: new Date(Date.now() - 5000) },
      { id: 'test-b', topic: 'Topic B', publishAt: new Date(Date.now() - 10000) },
    ];
    mockFindMany.mockResolvedValue(dueTests as never);
    // Each call to publishTest triggers findUnique+update
    mockFindUnique.mockResolvedValue(makeTest() as never);
    mockUpdate.mockResolvedValue({} as never);

    const result = await publishDueScheduledTests();
    expect(result.processed).toBe(2);
    expect(result.published).toBe(2);
    expect(result.blocked).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('skips ineligible tests and records errors', async () => {
    const dueTests = [
      { id: 'test-a', topic: 'Topic A', publishAt: new Date(Date.now() - 5000) },
    ];
    mockFindMany.mockResolvedValue(dueTests as never);
    // Make test ineligible (stale validation)
    mockFindUnique.mockResolvedValue(makeTest({
      contentVersion: 2,
      validation: { overallStatus: 'READY', failed: 0, reviewNeeded: 0, contentVersion: 1 },
    }) as never);

    const result = await publishDueScheduledTests();
    expect(result.processed).toBe(1);
    expect(result.published).toBe(0);
    expect(result.blocked).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('returns zeros when no tests are due', async () => {
    mockFindMany.mockResolvedValue([] as never);
    const result = await publishDueScheduledTests();
    expect(result).toEqual({ processed: 0, published: 0, blocked: 0, errors: [] });
  });

  it('is idempotent — already PUBLISHED tests would not be found again', async () => {
    // Cron queries status=SCHEDULED, so published tests are not returned
    mockFindMany.mockResolvedValue([] as never);
    const result1 = await publishDueScheduledTests();
    const result2 = await publishDueScheduledTests();
    expect(result1.published).toBe(0);
    expect(result2.published).toBe(0);
  });
});
