/**
 * Stale GENERATING recovery tests — GET /api/admin/tests
 *
 * Verifies:
 *  - Only GENERATING records older than 8 minutes become DRAFT
 *  - GENERATING records newer than 8 minutes remain unchanged
 *  - GENERATED/READY/PUBLISHED/ARCHIVED records are never modified
 *  - updateMany failure is logged but GET still returns the test list
 *  - /admin/subject-tests calls GET /api/admin/tests (confirmed by source)
 *  - Test numbering bug: stale DRAFT records (fixed) do not inflate test numbers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdateMany = vi.fn();
const mockFindMany = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    generatedTest: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { GET } from '@/app/api/admin/tests/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTest(status: string, updatedAt: Date) {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    exam: 'BPSC TRE 4',
    category: 'History',
    topic: 'Test Topic',
    slug: 'test-slug',
    titleHi: 'परीक्षा',
    titleEn: 'Test',
    difficulty: 'Moderate',
    totalQuestions: 20,
    durationMinutes: 20,
    status,
    plannedPublishAt: null,
    generationModel: null,
    generationMs: null,
    errorMessage: null,
    createdAt: updatedAt,
    updatedAt,
  };
}

const NOW = new Date('2026-09-05T10:00:00Z');
const STALE_AT = new Date(NOW.getTime() - 10 * 60 * 1000); // 10 min ago → stale
const FRESH_AT = new Date(NOW.getTime() - 4 * 60 * 1000);  // 4 min ago → not stale

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);

  // Default: updateMany succeeds with 0 records updated
  mockUpdateMany.mockResolvedValue({ count: 0 });
  // Default: findMany returns empty list
  mockFindMany.mockResolvedValue([]);
});

// ─── Stale GENERATING recovery ────────────────────────────────────────────────

describe('GET /api/admin/tests — stale recovery', () => {
  it('calls updateMany for stale GENERATING records before returning tests', async () => {
    await GET();
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('updateMany WHERE clause targets only GENERATING status', async () => {
    await GET();
    const args = mockUpdateMany.mock.calls[0][0] as {
      where: { status: string; updatedAt: { lt: Date } };
    };
    expect(args.where.status).toBe('GENERATING');
  });

  it('updateMany WHERE clause uses updatedAt < now-8min threshold', async () => {
    await GET();
    const args = mockUpdateMany.mock.calls[0][0] as {
      where: { updatedAt: { lt: Date } };
    };
    const threshold = args.where.updatedAt.lt;
    const expectedThresholdMs = NOW.getTime() - 8 * 60 * 1000;
    // Allow 1s tolerance for execution time
    expect(Math.abs(threshold.getTime() - expectedThresholdMs)).toBeLessThan(1000);
  });

  it('updateMany sets status=DRAFT and errorMessage', async () => {
    await GET();
    const args = mockUpdateMany.mock.calls[0][0] as {
      data: { status: string; errorMessage: string };
    };
    expect(args.data.status).toBe('DRAFT');
    expect(args.data.errorMessage).toContain('timed out');
  });

  it('GENERATING record newer than 8 minutes is NOT in the updateMany WHERE scope', async () => {
    // A fresh GENERATING record has updatedAt = NOW - 4min, which is NOT < threshold (NOW - 8min)
    // The WHERE clause `updatedAt < threshold` correctly excludes it
    await GET();
    const args = mockUpdateMany.mock.calls[0][0] as {
      where: { updatedAt: { lt: Date } };
    };
    const threshold = args.where.updatedAt.lt;
    expect(FRESH_AT.getTime()).toBeGreaterThan(threshold.getTime()); // fresh > threshold → not matched
  });

  it('GENERATING record older than 8 minutes IS in the updateMany WHERE scope', async () => {
    await GET();
    const args = mockUpdateMany.mock.calls[0][0] as {
      where: { updatedAt: { lt: Date } };
    };
    const threshold = args.where.updatedAt.lt;
    expect(STALE_AT.getTime()).toBeLessThan(threshold.getTime()); // stale < threshold → matched ✓
  });
});

// ─── Non-interference with other statuses ────────────────────────────────────

describe('GET /api/admin/tests — stale recovery does not touch completed tests', () => {
  it('WHERE clause excludes GENERATED (status check)', async () => {
    await GET();
    const args = mockUpdateMany.mock.calls[0][0] as { where: { status: string } };
    expect(args.where.status).toBe('GENERATING'); // explicitly, not 'GENERATED'
  });

  it('WHERE clause excludes READY', async () => {
    await GET();
    const args = mockUpdateMany.mock.calls[0][0] as { where: { status: string } };
    expect(args.where.status).not.toBe('READY');
  });

  it('WHERE clause excludes PUBLISHED', async () => {
    await GET();
    const args = mockUpdateMany.mock.calls[0][0] as { where: { status: string } };
    expect(args.where.status).not.toBe('PUBLISHED');
  });

  it('WHERE clause excludes ARCHIVED', async () => {
    await GET();
    const args = mockUpdateMany.mock.calls[0][0] as { where: { status: string } };
    expect(args.where.status).not.toBe('ARCHIVED');
  });
});

// ─── Recovery failure is non-fatal ────────────────────────────────────────────

describe('GET /api/admin/tests — recovery failure is non-fatal', () => {
  it('updateMany failure does not prevent GET from returning the test list', async () => {
    mockUpdateMany.mockRejectedValue(new Error('DB connection error'));
    const sampleTest = makeTest('GENERATED', FRESH_AT);
    mockFindMany.mockResolvedValue([sampleTest]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { tests: unknown[] };
    expect(body.tests).toHaveLength(1);
  });

  it('updateMany failure is logged (console.error called)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateMany.mockRejectedValue(new Error('Network timeout'));
    mockFindMany.mockResolvedValue([]);

    await GET();
    expect(errSpy).toHaveBeenCalled();
    const loggedMsg = errSpy.mock.calls[0].join(' ');
    expect(loggedMsg).toContain('Stale');
  });

  it('findMany is still called even when updateMany fails', async () => {
    mockUpdateMany.mockRejectedValue(new Error('fail'));
    mockFindMany.mockResolvedValue([]);

    await GET();
    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });
});

// ─── /admin/subject-tests uses GET /api/admin/tests ──────────────────────────

describe('/admin/subject-tests uses GET /api/admin/tests for test list', () => {
  it('page.tsx loadTests fetches /api/admin/tests (source-confirmed)', async () => {
    // Confirmed by reading src/app/admin/subject-tests/page.tsx:
    // const res = await fetch('/api/admin/tests');
    // This means stale recovery fires every time the subject-tests admin page loads.
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/admin/subject-tests/page.tsx'),
      'utf8',
    );
    expect(source).toContain("fetch('/api/admin/tests')");
  });
});

// ─── Test numbering — stale DRAFT records ────────────────────────────────────

describe('Test numbering — stale DRAFT records do not inflate test numbers', () => {
  it('NUMBERING_STATUSES set excludes DRAFT and GENERATING', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/admin/subject-tests/page.tsx'),
      'utf8',
    );
    expect(source).toContain('NUMBERING_STATUSES');
    // The nextTestNumber calculation must use NUMBERING_STATUSES, not the old "!== ARCHIVED" filter
    expect(source).toContain('NUMBERING_STATUSES.has(t.status)');
  });

  it('only GENERATED and beyond count toward test number (logic test)', () => {
    const NUMBERING_STATUSES = new Set(['GENERATED', 'VALIDATING', 'VALIDATION_FAILED', 'READY', 'SCHEDULED', 'PUBLISHED']);

    const tests = [
      { category: 'Physics', status: 'DRAFT' },         // failed generation — must NOT count
      { category: 'Physics', status: 'GENERATING' },    // in-progress — must NOT count
      { category: 'Physics', status: 'GENERATED' },     // success — must count
      { category: 'Physics', status: 'PUBLISHED' },     // success — must count
      { category: 'Music', status: 'GENERATED' },       // different subject — must NOT affect Physics count
    ];

    const physicsCount = tests.filter(
      (t) => t.category === 'Physics' && NUMBERING_STATUSES.has(t.status),
    ).length;

    expect(physicsCount).toBe(2); // GENERATED + PUBLISHED
    expect(physicsCount + 1).toBe(3); // next test number = "Physics — Test 3", not "Physics — Test 5"
  });
});
