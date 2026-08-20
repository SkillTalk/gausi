// Agent 3 — Publish Service
// All server-side publishing logic: eligibility checks, staleness guard,
// publish, schedule, cancel-schedule, archive.
// This module is NEVER imported by client code.

import { db } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PublishError = { ok: false; message: string; httpStatus: number };
export type PublishSuccess<T = void> = { ok: true; data?: T };
export type PublishResult<T = void> = PublishSuccess<T> | PublishError;

const PUBLISHABLE_STATUSES = new Set(['READY', 'SCHEDULED']);

// ─── Eligibility check (shared guard) ────────────────────────────────────────

export type EligibilityResult =
  | { eligible: true; test: { id: string; status: string; contentVersion: number; totalQuestions: number } }
  | PublishError;

export async function checkPublishEligibility(testId: string): Promise<EligibilityResult> {
  const test = await db.generatedTest.findUnique({
    where: { id: testId },
    include: { validation: true },
  });

  if (!test) {
    return { ok: false, message: 'Test not found.', httpStatus: 404 };
  }

  if (!PUBLISHABLE_STATUSES.has(test.status)) {
    return {
      ok: false,
      message: `Cannot publish a test with status "${test.status}". Only READY or SCHEDULED tests may be published.`,
      httpStatus: 409,
    };
  }

  const validation = test.validation;
  if (!validation) {
    return {
      ok: false,
      message: 'No validation found. Please validate the test before publishing.',
      httpStatus: 422,
    };
  }

  if (validation.overallStatus !== 'READY') {
    return {
      ok: false,
      message: `Validation did not pass (status: ${validation.overallStatus}). Revalidate and fix all issues before publishing.`,
      httpStatus: 422,
    };
  }

  if (validation.failed > 0 || validation.reviewNeeded > 0) {
    return {
      ok: false,
      message: `Validation has open issues (${validation.failed} failed, ${validation.reviewNeeded} need review). Fix before publishing.`,
      httpStatus: 422,
    };
  }

  // Staleness: questions were regenerated after the last validation
  if (validation.contentVersion !== test.contentVersion) {
    return {
      ok: false,
      message: `Questions were regenerated (version ${test.contentVersion}) after the last validation (version ${validation.contentVersion}). Please revalidate.`,
      httpStatus: 422,
    };
  }

  return {
    eligible: true,
    test: {
      id: test.id,
      status: test.status,
      contentVersion: test.contentVersion,
      totalQuestions: test.totalQuestions,
    },
  };
}

// ─── Publish now ──────────────────────────────────────────────────────────────

export async function publishTest(testId: string): Promise<PublishResult<{ publishedAt: Date }>> {
  const eligibility = await checkPublishEligibility(testId);
  if (!('eligible' in eligibility)) return eligibility;

  const publishedAt = new Date();
  await db.generatedTest.update({
    where: { id: testId },
    data: {
      status: 'PUBLISHED',
      publishedAt,
      publishAt: null, // clear any scheduled time
    },
  });

  console.log(`[PUBLISH] ✅ testId=${testId} published at ${publishedAt.toISOString()}`);
  return { ok: true, data: { publishedAt } };
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export async function scheduleTest(
  testId: string,
  publishAt: Date,
): Promise<PublishResult<{ publishAt: Date }>> {
  // publishAt must be in the future (or very close — within 1 min tolerance)
  const now = new Date();
  if (publishAt.getTime() < now.getTime() - 60_000) {
    return {
      ok: false,
      message: 'Scheduled time is in the past. Choose a future date/time.',
      httpStatus: 400,
    };
  }

  const eligibility = await checkPublishEligibility(testId);
  if (!('eligible' in eligibility)) return eligibility;

  await db.generatedTest.update({
    where: { id: testId },
    data: { status: 'SCHEDULED', publishAt },
  });

  console.log(`[SCHEDULE] testId=${testId} scheduled for ${publishAt.toISOString()}`);
  return { ok: true, data: { publishAt } };
}

// ─── Cancel schedule ──────────────────────────────────────────────────────────

export async function cancelSchedule(testId: string): Promise<PublishResult> {
  const test = await db.generatedTest.findUnique({ where: { id: testId }, select: { status: true } });
  if (!test) {
    return { ok: false, message: 'Test not found.', httpStatus: 404 };
  }
  if (test.status !== 'SCHEDULED') {
    return {
      ok: false,
      message: `Test is not scheduled (status: "${test.status}"). Cannot cancel.`,
      httpStatus: 409,
    };
  }

  await db.generatedTest.update({
    where: { id: testId },
    data: { status: 'READY', publishAt: null },
  });

  console.log(`[CANCEL_SCHEDULE] testId=${testId} reverted to READY`);
  return { ok: true };
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export async function archiveTest(testId: string): Promise<PublishResult> {
  const test = await db.generatedTest.findUnique({ where: { id: testId }, select: { status: true } });
  if (!test) {
    return { ok: false, message: 'Test not found.', httpStatus: 404 };
  }
  if (test.status !== 'PUBLISHED') {
    return {
      ok: false,
      message: `Only PUBLISHED tests can be archived (current status: "${test.status}").`,
      httpStatus: 409,
    };
  }

  await db.generatedTest.update({
    where: { id: testId },
    data: { status: 'ARCHIVED' },
  });

  console.log(`[ARCHIVE] testId=${testId} archived`);
  return { ok: true };
}

// ─── Cron: publish due scheduled tests ───────────────────────────────────────

export type CronPublishResult = {
  processed: number;
  published: number;
  blocked: number;
  errors: string[];
};

export async function publishDueScheduledTests(): Promise<CronPublishResult> {
  const now = new Date();

  // Find all SCHEDULED tests whose publishAt is <= now
  const due = await db.generatedTest.findMany({
    where: {
      status: 'SCHEDULED',
      publishAt: { lte: now },
    },
    select: { id: true, topic: true, publishAt: true },
  });

  const result: CronPublishResult = {
    processed: due.length,
    published: 0,
    blocked: 0,
    errors: [],
  };

  for (const test of due) {
    try {
      const res = await publishTest(test.id);
      if (res.ok) {
        result.published++;
      } else {
        result.blocked++;
        result.errors.push(`${test.id} (${test.topic}): ${res.message}`);
      }
    } catch (err) {
      result.blocked++;
      result.errors.push(
        `${test.id} (${test.topic}): ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  return result;
}
