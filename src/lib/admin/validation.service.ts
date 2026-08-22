/**
 * Validation Service — Agent 2 core logic extracted for reuse by Agent 4.
 *
 * The validate route delegates to this module.
 * The automation service calls this directly (no HTTP round-trip).
 *
 * Server-only. Never import in client components.
 */

import { db } from '@/lib/db';
import { runDeterministicValidation } from '@/lib/admin/deterministic-validator';
import { runAIValidation, mergeValidationResults, type TopicScopeContext } from '@/lib/admin/ai-validator';
import type { GeneratedQuestion } from '@/types/generated-test';
import type { QuestionValidationInput, ValidationOverallStatus } from '@/types/validation';

// ─── Result types ─────────────────────────────────────────────────────────────

export type ValidationSuccess = {
  ok: true;
  overallStatus: 'READY' | 'VALIDATION_FAILED';
  passed: number;
  failed: number;
  reviewNeeded: number;
  validationMs: number;
  validationSummary: string;
};

export type ValidationError = {
  ok: false;
  error: string;
  stage: 'LOAD' | 'STATUS_UPDATE' | 'AI_CALL' | 'DB_WRITE';
};

export type ValidationResult = ValidationSuccess | ValidationError;

const VALIDATABLE_STATUSES = new Set(['GENERATED', 'VALIDATION_FAILED', 'READY']);

// ─── Core validation function ─────────────────────────────────────────────────

export async function validateTest(testId: string, apiKey: string): Promise<ValidationResult> {
  // 1. Load test + questions
  type TestRow = {
    id: string;
    exam: string;
    category: string;
    topic: string;
    difficulty: string;
    status: string;
    totalQuestions: number;
    contentVersion: number;
    strictTopicScope: string | null;
    excludeScope: string | null;
    topicAdherenceMode: string | null;
    questions: GeneratedQuestion[];
  };

  let test: TestRow | null;
  try {
    test = await db.generatedTest.findUnique({
      where: { id: testId },
      include: { questions: { orderBy: { order: 'asc' } } },
    }) as TestRow | null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB load error';
    console.error(`[VAL_SVC:${testId}] DB load error:`, msg);
    return { ok: false, error: `Failed to load test: ${msg}`, stage: 'LOAD' };
  }

  if (!test) {
    return { ok: false, error: `Test not found: ${testId}`, stage: 'LOAD' };
  }

  if (!VALIDATABLE_STATUSES.has(test.status)) {
    return {
      ok: false,
      error: `Test status is "${test.status}". Validation requires GENERATED or VALIDATION_FAILED.`,
      stage: 'STATUS_UPDATE',
    };
  }

  if (test.questions.length === 0) {
    return { ok: false, error: 'Test has no questions.', stage: 'LOAD' };
  }

  // 2. Mark as VALIDATING
  try {
    await db.generatedTest.update({ where: { id: testId }, data: { status: 'VALIDATING' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to set VALIDATING: ${msg}`, stage: 'STATUS_UPDATE' };
  }

  const startMs = Date.now();

  // 3. Deterministic checks
  const { results: detResults, cleanQuestionIds } = runDeterministicValidation(
    test.questions as GeneratedQuestion[],
  );

  // 4. AI checks
  let mergedResults: QuestionValidationInput[] = detResults;
  let aiModel: string | null = null;
  let aiSummary = '';

  const cleanQuestions = test.questions.filter((q: GeneratedQuestion) =>
    cleanQuestionIds.has(q.id),
  ) as GeneratedQuestion[];

  // Build scope context from test fields (null if no scope defined)
  const scopeCtx: TopicScopeContext | null =
    test.strictTopicScope || test.excludeScope
      ? {
          strictTopicScope: test.strictTopicScope,
          excludeScope: test.excludeScope,
          topicAdherenceMode: (test.topicAdherenceMode === 'NORMAL' ? 'NORMAL' : 'STRICT'),
        }
      : null;

  if (cleanQuestions.length > 0) {
    try {
      const aiRun = await runAIValidation(
        apiKey,
        cleanQuestions,
        test.exam,
        test.category,
        test.topic,
        test.difficulty,
        scopeCtx,
      );
      mergedResults = mergeValidationResults(detResults, aiRun.questionResults, cleanQuestionIds);
      aiModel = aiRun.model;
      aiSummary = aiRun.validationSummary;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI validation failed';
      console.error(`[VAL_SVC:${testId}] AI error:`, msg);
      await db.generatedTest
        .update({ where: { id: testId }, data: { status: 'GENERATED' } })
        .catch(() => {});
      return { ok: false, error: `AI validation failed: ${msg}`, stage: 'AI_CALL' };
    }
  } else {
    aiSummary = 'All questions failed deterministic checks; AI validation skipped.';
  }

  const validationMs = Date.now() - startMs;

  // 5. Compute stats
  const passed = mergedResults.filter((r) => r.status === 'PASS').length;
  const failed = mergedResults.filter((r) => r.status === 'FAIL').length;
  const reviewNeeded = mergedResults.filter((r) => r.status === 'REVIEW').length;

  const allPass = failed === 0 && reviewNeeded === 0;
  const overallStatus: ValidationOverallStatus = allPass ? 'READY' : 'VALIDATION_FAILED';

  const deterministicSummary =
    cleanQuestionIds.size < test.questions.length
      ? `${test.questions.length - cleanQuestionIds.size} question(s) failed structural checks. `
      : '';

  const validationSummary = deterministicSummary + aiSummary;

  // 6. Upsert validation + question results — avoid interactive transaction timeout on Neon.
  //    Delete old records, create new validation + results with createMany, then update status.
  try {
    const prev = await db.testValidation.findUnique({ where: { testId } });
    if (prev) {
      await db.questionValidationResult.deleteMany({ where: { validationId: prev.id } });
      await db.testValidation.delete({ where: { id: prev.id } });
    }

    const validation = await db.testValidation.create({
      data: {
        testId,
        totalQuestions: test!.questions.length,
        passed,
        failed,
        reviewNeeded,
        overallStatus,
        validationSummary,
        validatorModel: aiModel,
        validationMs,
        validatedAt: new Date(),
        contentVersion: test!.contentVersion,
      },
    });

    await db.questionValidationResult.createMany({
      data: mergedResults.map((r) => ({
        validationId: validation.id,
        questionId: r.questionId,
        order: r.order,
        status: r.status,
        confidence: r.confidence,
        issues: r.issues as object[],
        suggestedFix: r.suggestedFix ?? null,
        factualNotes: r.factualNotes ?? null,
      })),
    });

    await db.generatedTest.update({
      where: { id: testId },
      data: { status: overallStatus },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB write failed';
    console.error(`[VAL_SVC:${testId}] DB write failed:`, msg);
    await db.generatedTest
      .update({ where: { id: testId }, data: { status: 'GENERATED' } })
      .catch(() => {});
    return { ok: false, error: `Failed to save validation results: ${msg}`, stage: 'DB_WRITE' };
  }

  console.log(
    `[VAL_SVC:${testId}] ✅ ${overallStatus} | passed=${passed} failed=${failed} review=${reviewNeeded} | ${validationMs}ms`,
  );

  return { ok: true, overallStatus, passed, failed, reviewNeeded, validationMs, validationSummary };
}
