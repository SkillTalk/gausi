/**
 * Agent 5 — Topic Planner Service Tests
 *
 * All Prisma calls are mocked — no real DB required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExamTopic } from '@/generated/prisma/client';

// ─── Mock @/lib/db ────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  db: {
    examTopic: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// ─── Import after mock ────────────────────────────────────────────────────────

import {
  getNextEligibleTopic,
  markTopicUsed,
  makeTopicSlug,
  parseBulkPaste,
} from '@/lib/admin/topic-planner.service';
import { db } from '@/lib/db';

// typed reference to mocked db
const mockDb = db as unknown as {
  examTopic: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_DATE = new Date('2026-08-21T12:00:00Z');

function makeTopic(overrides: Partial<ExamTopic> = {}): ExamTopic {
  return {
    id: 'topic-1',
    exam: 'BPSC TRE 4',
    category: 'History',
    topic: 'Revolt of 1857',
    slug: 'bpsc-tre-4-history-revolt-of-1857',
    difficultyDefault: null,
    questionCountDefault: null,
    durationMinutesDefault: null,
    priority: 50,
    sequenceOrder: null,
    cooldownDays: 30,
    earliestUseDate: null,
    preferredDayOfWeek: null,
    notes: null,
    enabled: true,
    status: 'ACTIVE',
    lastUsedAt: null,
    timesUsed: 0,
    createdAt: new Date('2026-08-01'),
    updatedAt: new Date('2026-08-01'),
    strictTopicScope: null,
    excludeScope: null,
    topicAdherenceMode: 'STRICT',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getNextEligibleTopic ─────────────────────────────────────────────────────

describe('getNextEligibleTopic', () => {
  it('returns the only active enabled topic', async () => {
    const topic = makeTopic();
    mockDb.examTopic.findMany.mockResolvedValue([topic]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', now: BASE_DATE });
    expect(result?.id).toBe('topic-1');
  });

  it('returns null when no topics exist', async () => {
    mockDb.examTopic.findMany.mockResolvedValue([]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', now: BASE_DATE });
    expect(result).toBeNull();
  });

  it('skips topic within cooldown period', async () => {
    const usedRecently = makeTopic({
      lastUsedAt: new Date(BASE_DATE.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      cooldownDays: 30,
    });
    mockDb.examTopic.findMany.mockResolvedValue([usedRecently]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', allowRepeat: false, now: BASE_DATE });
    expect(result).toBeNull();
  });

  it('returns topic after cooldown has expired', async () => {
    const expiredCooldown = makeTopic({
      lastUsedAt: new Date(BASE_DATE.getTime() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      cooldownDays: 30,
    });
    mockDb.examTopic.findMany.mockResolvedValue([expiredCooldown]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', allowRepeat: false, now: BASE_DATE });
    expect(result?.id).toBe('topic-1');
  });

  it('ignores cooldown when allowRepeat=true', async () => {
    const usedRecently = makeTopic({
      lastUsedAt: new Date(BASE_DATE.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      cooldownDays: 30,
    });
    mockDb.examTopic.findMany.mockResolvedValue([usedRecently]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', allowRepeat: true, now: BASE_DATE });
    expect(result?.id).toBe('topic-1');
  });

  it('skips topic before earliestUseDate', async () => {
    const futureOnly = makeTopic({
      earliestUseDate: new Date(BASE_DATE.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
    });
    mockDb.examTopic.findMany.mockResolvedValue([futureOnly]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', now: BASE_DATE });
    expect(result).toBeNull();
  });

  it('prefers higher priority topic', async () => {
    const low  = makeTopic({ id: 'low',  priority: 10 });
    const high = makeTopic({ id: 'high', priority: 100 });
    // findMany returns in DB-ordered sequence (priority DESC already)
    mockDb.examTopic.findMany.mockResolvedValue([high, low]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', now: BASE_DATE });
    expect(result?.id).toBe('high');
  });

  it('prefers never-used topic over used one (same priority)', async () => {
    const used  = makeTopic({ id: 'used',  lastUsedAt: new Date('2026-07-01'), priority: 50 });
    const fresh = makeTopic({ id: 'fresh', lastUsedAt: null,                   priority: 50 });
    // Simulate DB ordering: nulls first (never-used first)
    mockDb.examTopic.findMany.mockResolvedValue([fresh, used]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', now: BASE_DATE });
    expect(result?.id).toBe('fresh');
  });

  it('prefers least recently used among used topics (same priority)', async () => {
    const older = makeTopic({ id: 'older', lastUsedAt: new Date('2026-06-01'), priority: 50 });
    const newer = makeTopic({ id: 'newer', lastUsedAt: new Date('2026-07-15'), priority: 50, cooldownDays: 0 });
    mockDb.examTopic.findMany.mockResolvedValue([older, newer]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', allowRepeat: true, now: BASE_DATE });
    expect(result?.id).toBe('older');
  });

  it('skips disabled topic (status PAUSED)', async () => {
    const paused = makeTopic({ status: 'PAUSED', enabled: false });
    mockDb.examTopic.findMany.mockResolvedValue([]); // DB WHERE already filters these out
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', now: BASE_DATE });
    expect(result).toBeNull();
    // Verify findMany was called with correct filters
    expect(mockDb.examTopic.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE', enabled: true }),
      })
    );
    void paused; // suppress unused var warning
  });

  it('skips archived topic', async () => {
    mockDb.examTopic.findMany.mockResolvedValue([]); // DB WHERE filters ARCHIVED
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', now: BASE_DATE });
    expect(result).toBeNull();
  });

  it('handles multiple topics: skips cooldown, returns next eligible', async () => {
    const inCooldown = makeTopic({ id: 'cooling', priority: 100,
      lastUsedAt: new Date(BASE_DATE.getTime() - 5 * 24 * 60 * 60 * 1000), cooldownDays: 30 });
    const eligible = makeTopic({ id: 'eligible', priority: 50, lastUsedAt: null });
    mockDb.examTopic.findMany.mockResolvedValue([inCooldown, eligible]);
    const result = await getNextEligibleTopic({ exam: 'BPSC TRE 4', allowRepeat: false, now: BASE_DATE });
    expect(result?.id).toBe('eligible');
  });
});

// ─── markTopicUsed ────────────────────────────────────────────────────────────

describe('markTopicUsed', () => {
  it('increments timesUsed and sets lastUsedAt', async () => {
    mockDb.examTopic.update.mockResolvedValue({});
    await markTopicUsed('topic-1', BASE_DATE);
    expect(mockDb.examTopic.update).toHaveBeenCalledWith({
      where: { id: 'topic-1' },
      data: { lastUsedAt: BASE_DATE, timesUsed: { increment: 1 } },
    });
  });
});

// ─── makeTopicSlug ────────────────────────────────────────────────────────────

describe('makeTopicSlug', () => {
  it('generates a URL-safe slug', () => {
    expect(makeTopicSlug('BPSC TRE 4', 'History', 'Revolt of 1857')).toBe('bpsc-tre-4-history-revolt-of-1857');
  });

  it('handles special characters', () => {
    const slug = makeTopicSlug('BPSC TRE 4', 'General Science', 'Newton\'s Laws');
    expect(slug).not.toMatch(/[^a-z0-9-]/);
  });
});

// ─── parseBulkPaste ───────────────────────────────────────────────────────────

describe('parseBulkPaste', () => {
  it('parses pipe-separated rows', () => {
    const text = 'History | Revolt of 1857\nGeography | Indian Rivers';
    const rows = parseBulkPaste('BPSC TRE 4', text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ category: 'History', topic: 'Revolt of 1857', priority: 50 });
    expect(rows[1]).toMatchObject({ category: 'Geography', topic: 'Indian Rivers' });
  });

  it('parses custom priority in third column', () => {
    const rows = parseBulkPaste('BPSC TRE 4', 'History | Revolt of 1857 | 100');
    expect(rows[0].priority).toBe(100);
  });

  it('skips blank lines and comment lines', () => {
    const text = '\n# comment\nHistory | Topic A\n\n';
    const rows = parseBulkPaste('BPSC TRE 4', text);
    expect(rows).toHaveLength(1);
  });

  it('skips rows missing category or topic', () => {
    const text = 'History |\n| Topic Only\nValid | Topic';
    const rows = parseBulkPaste('BPSC TRE 4', text);
    expect(rows).toHaveLength(1);
    expect(rows[0].topic).toBe('Topic');
  });

  it('sets exam on all rows', () => {
    const rows = parseBulkPaste('BPSC TRE 4', 'History | Test Topic');
    expect(rows[0].exam).toBe('BPSC TRE 4');
  });
});
