/**
 * Automation Service — Agent 4 orchestrator.
 *
 * Coordinates: generate (Agent 1) → validate (Agent 2) → schedule/publish (Agent 3).
 * Enforces idempotency, topic-repeat guard, and clean failure handling.
 *
 * Server-only. Never import in client components.
 */

import { db } from '@/lib/db';
import { generateTest } from '@/lib/admin/generation.service';
import { validateTest } from '@/lib/admin/validation.service';
import { scheduleTest, publishTest } from '@/lib/admin/publish.service';
import { validateGenerateInput, sanitizeInput } from '@/lib/admin/admin-validator';
import type { GenerateTestInput } from '@/types/generated-test';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutomationRunStatus =
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'HELD_FOR_REVIEW'
  | 'SKIPPED';

export type AutomationResult = {
  status: AutomationRunStatus;
  runId?: string;
  runKey?: string;
  generatedTestId?: string;
  message: string;
  generationMs?: number;
  validationMs?: number;
};

// ─── IST date helpers ─────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" in IST (UTC+5:30). */
export function getISTDateString(now = new Date()): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().slice(0, 10);
}

/** Returns midnight IST of a given IST date string as a UTC Date. */
export function istMidnightUTC(istDateStr: string): Date {
  return new Date(`${istDateStr}T00:00:00+05:30`);
}

/** Converts "HH:MM" IST time on a given IST date to UTC Date. */
export function istTimeToUTC(istTimeStr: string, istDateStr: string): Date {
  const [h, m] = istTimeStr.split(':').map(Number);
  const hh = String(h).padStart(2, '0');
  const mm = String(m ?? 0).padStart(2, '0');
  return new Date(`${istDateStr}T${hh}:${mm}:00+05:30`);
}

/** Builds the idempotency run key for a given config + IST date. */
export function buildRunKey(exam: string, category: string, istDateStr: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  return `${slug(exam)}-${slug(category)}-${istDateStr}`;
}

// ─── Topic repeat guard ───────────────────────────────────────────────────────

const TOPIC_LOOKBACK_DAYS = 30;

export async function isTopicRecentlyUsed(
  topic: string,
  category: string,
  exam: string,
): Promise<boolean> {
  const since = new Date(Date.now() - TOPIC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const recent = await db.generatedTest.findFirst({
    where: {
      topic: { equals: topic, mode: 'insensitive' },
      category: { equals: category, mode: 'insensitive' },
      exam: { equals: exam, mode: 'insensitive' },
      status: { notIn: ['DRAFT'] },
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return !!recent;
}

// ─── Config loader ────────────────────────────────────────────────────────────

/** Returns the single automation config, or null if none exists. */
export async function getAutomationConfig() {
  return db.dailyAutomationConfig.findFirst({ orderBy: { createdAt: 'asc' } });
}

/** Upserts the single automation config (creates if absent, updates if present). */
export async function upsertAutomationConfig(
  data: Partial<{
    exam: string;
    category: string;
    topic: string;
    difficulty: string;
    totalQuestions: number;
    durationMinutes: number;
    enabled: boolean;
    autoPublish: boolean;
    allowRepeat: boolean;
    generateTime: string;
    publishTime: string;
    timezone: string;
  }>,
) {
  const existing = await getAutomationConfig();
  if (existing) {
    return db.dailyAutomationConfig.update({ where: { id: existing.id }, data });
  }
  return db.dailyAutomationConfig.create({
    data: {
      exam: 'BPSC TRE 4',
      category: 'History',
      topic: '',
      difficulty: 'Moderate',
      totalQuestions: 25,
      durationMinutes: 15,
      enabled: false,
      autoPublish: true,
      allowRepeat: false,
      generateTime: '04:00',
      publishTime: '05:00',
      timezone: 'Asia/Kolkata',
      ...data,
    },
  });
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export type RunOptions = {
  /** Override today's IST date for testing. */
  overrideDateStr?: string;
  /** Force run even if disabled (used by Run Now). */
  force?: boolean;
};

export async function runAutomation(options: RunOptions = {}): Promise<AutomationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { status: 'FAILED', message: 'OpenAI API key is not configured (OPENAI_API_KEY missing).' };
  }

  // 1. Load config
  const config = await getAutomationConfig();
  if (!config) {
    return { status: 'SKIPPED', message: 'No automation config found. Create one in /admin/automation.' };
  }

  // 2. Check enabled (unless forced by Run Now)
  if (!config.enabled && !options.force) {
    return { status: 'SKIPPED', message: 'Automation is disabled.' };
  }

  // 3. Validate topic is set
  if (!config.topic.trim()) {
    return { status: 'SKIPPED', message: 'No topic configured. Set the topic for the next daily test.' };
  }

  // 4. Idempotency check
  const istDate = options.overrideDateStr ?? getISTDateString();
  const runKey = buildRunKey(config.exam, config.category, istDate);

  const existingRun = await db.automationRun.findUnique({ where: { runKey } });
  if (existingRun) {
    return {
      status: existingRun.status as AutomationRunStatus,
      runId: existingRun.id,
      runKey,
      generatedTestId: existingRun.generatedTestId ?? undefined,
      message: `Run already exists for ${istDate} (status: ${existingRun.status}).`,
    };
  }

  // 5. Topic repeat guard
  if (!config.allowRepeat) {
    const alreadyUsed = await isTopicRecentlyUsed(config.topic, config.category, config.exam);
    if (alreadyUsed) {
      const run = await db.automationRun.create({
        data: {
          configId: config.id,
          runKey,
          scheduledFor: istMidnightUTC(istDate),
          startedAt: new Date(),
          finishedAt: new Date(),
          status: 'SKIPPED',
          errorStage: 'TOPIC_GUARD',
          errorMessage: `Topic "${config.topic}" was used in the last ${TOPIC_LOOKBACK_DAYS} days. Set "Allow Repeat" to override.`,
          topic: config.topic,
          category: config.category,
          exam: config.exam,
          totalQuestions: config.totalQuestions,
        },
      });
      await db.dailyAutomationConfig.update({
        where: { id: config.id },
        data: { lastRunAt: new Date(), lastRunStatus: 'SKIPPED' },
      });
      return {
        status: 'SKIPPED',
        runId: run.id,
        runKey,
        message: `Topic "${config.topic}" was recently used. Change the topic or enable Allow Repeat.`,
      };
    }
  }

  // 6. Create AutomationRun in RUNNING state
  const scheduledFor = istMidnightUTC(istDate);
  const run = await db.automationRun.create({
    data: {
      configId: config.id,
      runKey,
      scheduledFor,
      startedAt: new Date(),
      status: 'RUNNING',
      topic: config.topic,
      category: config.category,
      exam: config.exam,
      totalQuestions: config.totalQuestions,
    },
  });

  const input: GenerateTestInput = {
    exam: config.exam as GenerateTestInput['exam'],
    category: config.category,
    topic: config.topic,
    difficulty: config.difficulty as GenerateTestInput['difficulty'],
    totalQuestions: config.totalQuestions,
    durationMinutes: config.durationMinutes,
  };

  // Validate input shape (reuse Agent 1 validator)
  const inputValidation = validateGenerateInput(input);
  if (!inputValidation.valid) {
    const errMsg = inputValidation.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    await finalizeRun(run.id, config.id, {
      status: 'FAILED',
      errorStage: 'GENERATION',
      errorMessage: `Config validation failed: ${errMsg}`,
    });
    return { status: 'FAILED', runId: run.id, runKey, message: `Invalid automation config: ${errMsg}` };
  }

  const sanitized = sanitizeInput(input as unknown as Record<string, unknown>);

  // 7. Generate test
  const genResult = await generateTest(sanitized, apiKey);
  if (!genResult.ok) {
    await db.automationRun.update({
      where: { id: run.id },
      data: { generationStatus: 'FAILED', errorStage: 'GENERATION', errorMessage: genResult.error },
    });
    await finalizeRun(run.id, config.id, {
      status: 'FAILED',
      errorStage: 'GENERATION',
      errorMessage: genResult.error,
      generationDurationMs: undefined,
    });
    return { status: 'FAILED', runId: run.id, runKey, message: `Generation failed: ${genResult.error}` };
  }

  await db.automationRun.update({
    where: { id: run.id },
    data: {
      generatedTestId: genResult.testId,
      generationStatus: 'GENERATED',
      generationDurationMs: genResult.generationMs,
    },
  });

  // 8. Validate test
  const valResult = await validateTest(genResult.testId, apiKey);
  if (!valResult.ok) {
    await finalizeRun(run.id, config.id, {
      status: 'FAILED',
      errorStage: 'VALIDATION',
      errorMessage: valResult.error,
      generatedTestId: genResult.testId,
      generationDurationMs: genResult.generationMs,
      generationStatus: 'GENERATED',
      validationStatus: 'FAILED',
    });
    return {
      status: 'FAILED',
      runId: run.id,
      runKey,
      generatedTestId: genResult.testId,
      message: `Validation error: ${valResult.error}`,
      generationMs: genResult.generationMs,
    };
  }

  // 9. Handle validation result
  if (valResult.overallStatus === 'VALIDATION_FAILED') {
    await finalizeRun(run.id, config.id, {
      status: 'HELD_FOR_REVIEW',
      generatedTestId: genResult.testId,
      generationStatus: 'GENERATED',
      validationStatus: 'VALIDATION_FAILED',
      generationDurationMs: genResult.generationMs,
      validationDurationMs: valResult.validationMs,
    });
    return {
      status: 'HELD_FOR_REVIEW',
      runId: run.id,
      runKey,
      generatedTestId: genResult.testId,
      message: `Test generated but validation failed (${valResult.failed} failed, ${valResult.reviewNeeded} review). Held for admin review.`,
      generationMs: genResult.generationMs,
      validationMs: valResult.validationMs,
    };
  }

  // Validation passed — READY
  let pubStatus = 'READY';

  if (config.autoPublish) {
    const publishAt = istTimeToUTC(config.publishTime, istDate);
    const now = new Date();

    try {
      if (publishAt <= now) {
        // Publish time has already passed — publish immediately
        const pubResult = await publishTest(genResult.testId);
        if (pubResult.ok) {
          pubStatus = 'PUBLISHED';
        } else {
          pubStatus = `PUBLISH_FAILED: ${pubResult.message}`;
        }
      } else {
        // Schedule for the configured publish time
        const schedResult = await scheduleTest(genResult.testId, publishAt);
        if (schedResult.ok) {
          pubStatus = 'SCHEDULED';
        } else {
          pubStatus = `SCHEDULE_FAILED: ${schedResult.message}`;
        }
      }
    } catch (err) {
      pubStatus = `PUBLISH_ERROR: ${err instanceof Error ? err.message : 'unknown'}`;
    }
  }

  await finalizeRun(run.id, config.id, {
    status: 'SUCCESS',
    generatedTestId: genResult.testId,
    generationStatus: 'GENERATED',
    validationStatus: 'READY',
    publicationStatus: pubStatus,
    generationDurationMs: genResult.generationMs,
    validationDurationMs: valResult.validationMs,
  });

  return {
    status: 'SUCCESS',
    runId: run.id,
    runKey,
    generatedTestId: genResult.testId,
    message: `Success. Generated ${valResult.passed} passing questions. Publication: ${pubStatus}.`,
    generationMs: genResult.generationMs,
    validationMs: valResult.validationMs,
  };
}

// ─── Run finalization helper ──────────────────────────────────────────────────

async function finalizeRun(
  runId: string,
  configId: string,
  data: {
    status: AutomationRunStatus;
    generatedTestId?: string;
    generationStatus?: string;
    validationStatus?: string;
    publicationStatus?: string;
    errorStage?: string;
    errorMessage?: string;
    generationDurationMs?: number;
    validationDurationMs?: number;
  },
) {
  const now = new Date();
  await db.automationRun.update({
    where: { id: runId },
    data: {
      finishedAt: now,
      ...data,
    },
  });

  await db.dailyAutomationConfig.update({
    where: { id: configId },
    data: {
      lastRunAt: now,
      lastRunStatus: data.status,
    },
  });
}
