/**
 * Topic Planner Service — Agent 5
 *
 * Deterministic, AI-free topic selection from the ExamTopic queue.
 *
 * Selection algorithm (in order):
 *  1. ACTIVE + enabled topics for the given exam
 *  2. Respect earliestUseDate (skip if not yet reached)
 *  3. Respect cooldown: skip topics used within cooldownDays (unless allowRepeat)
 *  4. Highest priority first (priority DESC)
 *  5. Tie: never-used topics preferred (lastUsedAt IS NULL first)
 *  6. Tie: least recently used first (lastUsedAt ASC)
 *  7. Stable tie-breaker: sequenceOrder ASC, then createdAt ASC
 *
 * Topic consumption rules (documented):
 *  - Generation fails before test is created → DO NOT mark topic used
 *  - Generation succeeds (test record created) → mark used (timesUsed++, lastUsedAt=now)
 *    even if validation or publishing later fails — a complete paper was generated.
 *
 * Server-only. Never import in client components.
 */

import { db } from '@/lib/db';
import type { ExamTopic } from '@/generated/prisma/client';

export type { ExamTopic };

// ─── Slug helper ──────────────────────────────────────────────────────────────

export function makeTopicSlug(exam: string, category: string, topic: string): string {
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  return `${slugify(exam)}-${slugify(category)}-${slugify(topic)}`;
}

/** Ensure slug is unique by appending a numeric suffix if needed. */
export async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let candidate = baseSlug;
  let attempt = 0;
  while (true) {
    const existing = await db.examTopic.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    attempt++;
    candidate = `${baseSlug}-${attempt}`;
  }
}

// ─── Topic selection ──────────────────────────────────────────────────────────

export type SelectTopicOptions = {
  exam: string;
  /** If true, skip cooldown check (from config.allowRepeat). */
  allowRepeat?: boolean;
  /** Override "now" for testing. */
  now?: Date;
};

/**
 * Returns the next eligible topic from the queue, or null if none available.
 * Does NOT modify any DB state — call markTopicUsed() after successful generation.
 */
export async function getNextEligibleTopic(
  options: SelectTopicOptions,
): Promise<ExamTopic | null> {
  const { exam, allowRepeat = false, now = new Date() } = options;

  // Fetch all ACTIVE enabled topics for this exam
  const candidates = await db.examTopic.findMany({
    where: {
      exam: { equals: exam, mode: 'insensitive' },
      status: 'ACTIVE',
      enabled: true,
    },
    orderBy: [
      { priority: 'desc' },
      { lastUsedAt: 'asc' },  // nulls first in Postgres
      { sequenceOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  for (const topic of candidates) {
    // Respect earliestUseDate
    if (topic.earliestUseDate && now < topic.earliestUseDate) {
      continue;
    }

    // Cooldown check
    if (!allowRepeat && topic.lastUsedAt !== null) {
      const cooldownMs = (topic.cooldownDays ?? 30) * 24 * 60 * 60 * 1000;
      const cooldownExpiry = new Date(topic.lastUsedAt.getTime() + cooldownMs);
      if (now < cooldownExpiry) {
        continue; // still in cooldown
      }
    }

    return topic;
  }

  return null;
}

/**
 * Marks a topic as used after a test has been successfully generated.
 * MUST be called only after a GeneratedTest record exists in the DB.
 */
export async function markTopicUsed(topicId: string, now = new Date()): Promise<void> {
  await db.examTopic.update({
    where: { id: topicId },
    data: {
      lastUsedAt: now,
      timesUsed: { increment: 1 },
    },
  });
}

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

export type CreateTopicInput = {
  exam: string;
  category: string;
  topic: string;
  difficultyDefault?: string | null;
  questionCountDefault?: number | null;
  durationMinutesDefault?: number | null;
  priority?: number;
  cooldownDays?: number;
  notes?: string | null;
  enabled?: boolean;
  /** Scope fields — carried to Agent 1 + Agent 2 during queue automation */
  strictTopicScope?: string | null;
  excludeScope?: string | null;
  topicAdherenceMode?: string;
};

export async function createTopic(input: CreateTopicInput): Promise<ExamTopic> {
  const baseSlug = makeTopicSlug(input.exam, input.category, input.topic);
  const slug = await ensureUniqueSlug(baseSlug);
  return db.examTopic.create({
    data: {
      exam: input.exam.trim(),
      category: input.category.trim(),
      topic: input.topic.trim(),
      slug,
      difficultyDefault: input.difficultyDefault ?? null,
      questionCountDefault: input.questionCountDefault ?? null,
      durationMinutesDefault: input.durationMinutesDefault ?? null,
      priority: input.priority ?? 50,
      cooldownDays: input.cooldownDays ?? 30,
      notes: input.notes ?? null,
      enabled: input.enabled ?? true,
      status: 'ACTIVE',
      strictTopicScope: input.strictTopicScope ?? null,
      excludeScope: input.excludeScope ?? null,
      topicAdherenceMode: input.topicAdherenceMode ?? 'STRICT',
    },
  });
}

export type UpdateTopicInput = Partial<{
  topic: string;
  category: string;
  difficultyDefault: string | null;
  questionCountDefault: number | null;
  durationMinutesDefault: number | null;
  priority: number;
  cooldownDays: number;
  notes: string | null;
  enabled: boolean;
  status: string;
  sequenceOrder: number | null;
  earliestUseDate: Date | null;
  preferredDayOfWeek: number | null;
  strictTopicScope: string | null;
  excludeScope: string | null;
  topicAdherenceMode: string;
}>;

export async function updateTopic(id: string, input: UpdateTopicInput): Promise<ExamTopic> {
  return db.examTopic.update({ where: { id }, data: input });
}

export async function pauseTopic(id: string): Promise<ExamTopic> {
  return db.examTopic.update({ where: { id }, data: { status: 'PAUSED', enabled: false } });
}

export async function resumeTopic(id: string): Promise<ExamTopic> {
  return db.examTopic.update({ where: { id }, data: { status: 'ACTIVE', enabled: true } });
}

export async function archiveTopic(id: string): Promise<ExamTopic> {
  return db.examTopic.update({ where: { id }, data: { status: 'ARCHIVED', enabled: false } });
}

export async function listTopics(filters: {
  exam?: string;
  category?: string;
  status?: string;
  enabled?: boolean;
}): Promise<ExamTopic[]> {
  return db.examTopic.findMany({
    where: {
      ...(filters.exam ? { exam: { equals: filters.exam, mode: 'insensitive' } } : {}),
      ...(filters.category ? { category: { equals: filters.category, mode: 'insensitive' } } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.enabled !== undefined ? { enabled: filters.enabled } : {}),
    },
    orderBy: [{ priority: 'desc' }, { lastUsedAt: 'asc' }, { createdAt: 'asc' }],
  });
}

// ─── Bulk import ──────────────────────────────────────────────────────────────

export type BulkImportRow = {
  exam: string;
  category: string;
  topic: string;
  priority?: number;
};

export type BulkImportResult = {
  created: number;
  skipped: number;
  errors: { row: string; reason: string }[];
};

/**
 * Parses pipe-separated bulk paste: "Category | Topic" or "Category | Topic | Priority"
 * Exam is shared for all rows in a bulk import call.
 */
export function parseBulkPaste(exam: string, raw: string): BulkImportRow[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      const category = parts[0] ?? '';
      const topic = parts[1] ?? '';
      const priority = parts[2] ? parseInt(parts[2], 10) : 50;
      return { exam, category, topic, priority: isNaN(priority) ? 50 : priority };
    })
    .filter((row) => row.category && row.topic);
}

export async function bulkImportTopics(
  rows: BulkImportRow[],
): Promise<BulkImportResult> {
  let created = 0;
  let skipped = 0;
  const errors: BulkImportResult['errors'] = [];

  for (const row of rows) {
    const rowLabel = `${row.category} | ${row.topic}`;
    try {
      // Skip duplicates (same exam+category+topic, case-insensitive)
      const existing = await db.examTopic.findFirst({
        where: {
          exam: { equals: row.exam, mode: 'insensitive' },
          category: { equals: row.category, mode: 'insensitive' },
          topic: { equals: row.topic, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await createTopic({ exam: row.exam, category: row.category, topic: row.topic, priority: row.priority ?? 50 });
      created++;
    } catch (err) {
      errors.push({ row: rowLabel, reason: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return { created, skipped, errors };
}

// ─── Stats helper ─────────────────────────────────────────────────────────────

export async function getTopicStats(exam: string) {
  const [activeCount, usedThisMonth, categories] = await Promise.all([
    db.examTopic.count({ where: { exam, status: 'ACTIVE', enabled: true } }),
    db.examTopic.count({
      where: {
        exam,
        lastUsedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.examTopic.findMany({
      where: { exam, status: 'ACTIVE' },
      distinct: ['category'],
      select: { category: true },
    }),
  ]);
  return {
    activeCount,
    usedThisMonth,
    categoryCount: categories.length,
  };
}
