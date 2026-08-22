/**
 * Validation Service — Agent 2 core logic extracted for reuse by Agent 4.
 *
 * ## Incremental validation (Aug 2026)
 *
 * Each GeneratedQuestion now has a `questionVersion` counter (starts at 1,
 * incremented on repair or admin answer override). Each QuestionValidationResult
 * also stores the `questionVersion` at which it was produced.
 *
 * A result is CURRENT when QVR.questionVersion === GeneratedQuestion.questionVersion.
 *
 * When admin clicks "Revalidate", only STALE questions (version mismatch or missing
 * QVR) are sent to the AI.  Unchanged questions keep their existing current results.
 * This avoids re-sending 24 unchanged questions when only 1 was repaired.
 *
 * Server-only. Never import in client components.
 */

import { db } from '@/lib/db';
import { runDeterministicValidation } from '@/lib/admin/deterministic-validator';
import { runAIValidation, mergeValidationResults, type TopicScopeContext } from '@/lib/admin/ai-validator';
import { computeStaleQuestions } from '@/lib/admin/validation-freshness';
import { applyContradictionGuard } from '@/lib/admin/validator-consistency';
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
  /** How many questions were actually sent to AI (≤ totalQuestions). */
  questionsValidated: number;
  /** IDs of questions that were stale and re-validated. */
  staleQuestionIds: string[];
};

export type ValidationError = {
  ok: false;
  error: string;
  stage: 'LOAD' | 'STATUS_UPDATE' | 'AI_CALL' | 'DB_WRITE';
};

export type ValidationResult = ValidationSuccess | ValidationError;

const VALIDATABLE_STATUSES = new Set(['GENERATED', 'VALIDATION_FAILED', 'READY']);

// ─── Shared types ─────────────────────────────────────────────────────────────

type QVRRow = {
  id: string;
  questionId: string;
  order: number;
  status: string;
  confidence: number;
  issues: unknown;
  suggestedFix: string | null;
  factualNotes: string | null;
  questionVersion: number;
};

type ExistingTV = {
  id: string;
  contentVersion: number;
  validatorModel: string | null;
  questionResults: QVRRow[];
} | null;

// ─── Core validation function ─────────────────────────────────────────────────

export async function validateTest(testId: string, apiKey: string): Promise<ValidationResult> {
  // 1. Load test + questions (including questionVersion for per-question freshness)
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
    questions: Array<GeneratedQuestion & { questionVersion: number }>;
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

  // 2. Load existing TestValidation + QVRs (with questionVersion)
  let existingTV: ExistingTV = null;

  try {
    const row = await db.testValidation.findUnique({
      where: { testId },
      select: {
        id: true,
        contentVersion: true,
        validatorModel: true,
        questionResults: {
          select: {
            id: true,
            questionId: true,
            order: true,
            status: true,
            confidence: true,
            issues: true,
            suggestedFix: true,
            factualNotes: true,
            questionVersion: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    existingTV = row as unknown as ExistingTV;
  } catch {
    // If we can't load existing validation, treat all questions as stale
  }

  // 3. Identify STALE questions via per-question version comparison
  const existingQVRs: Array<{ questionId: string; questionVersion: number }> =
    existingTV?.questionResults ?? [];

  const staleQuestionIds = computeStaleQuestions(
    test.questions.map((q) => ({ id: q.id, questionVersion: q.questionVersion })),
    existingQVRs,
  );

  const hasStaleQuestions = staleQuestionIds.length > 0;

  // 4. Mark as VALIDATING
  try {
    await db.generatedTest.update({ where: { id: testId }, data: { status: 'VALIDATING' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to set VALIDATING: ${msg}`, stage: 'STATUS_UPDATE' };
  }

  const startMs = Date.now();

  // 5. Deterministic checks on ALL questions (cheap, no AI cost)
  const { results: detResults, cleanQuestionIds } = runDeterministicValidation(
    test.questions as GeneratedQuestion[],
  );

  // For deterministic failures, they become stale too (always send to update QVR)
  const detFailedIds = new Set(detResults.filter((r) => r.status === 'FAIL').map((r) => r.questionId));

  // 6. Build scope context
  const scopeCtx: TopicScopeContext | null =
    test.strictTopicScope || test.excludeScope
      ? {
          strictTopicScope: test.strictTopicScope,
          excludeScope: test.excludeScope,
          topicAdherenceMode: (test.topicAdherenceMode === 'NORMAL' ? 'NORMAL' : 'STRICT'),
        }
      : null;

  // 7. Run AI on STALE + deterministic-failed questions only
  //    Questions that are current (version match, previous PASS/FAIL/REVIEW) are skipped.
  const aiCandidateIds = new Set([...staleQuestionIds, ...detFailedIds]);
  const aiCandidates = (test.questions as GeneratedQuestion[]).filter(
    (q) => aiCandidateIds.has(q.id) && cleanQuestionIds.has(q.id),
  );

  let newValidationResults: QuestionValidationInput[] = [];
  let aiModel: string | null = existingTV?.validatorModel ?? null;
  let aiSummary = '';
  const questionsValidated = aiCandidates.length;

  if (aiCandidates.length > 0) {
    try {
      const aiRun = await runAIValidation(
        apiKey,
        aiCandidates,
        test.exam,
        test.category,
        test.topic,
        test.difficulty,
        scopeCtx,
      );
      newValidationResults = mergeValidationResults(detResults, aiRun.questionResults, cleanQuestionIds);
      // Keep only stale/updated questions from merge
      newValidationResults = newValidationResults.filter((r) => aiCandidateIds.has(r.questionId));

      // Contradiction guard: if AI says FAIL but suggestedFix endorses the current
      // correct answer, downgrade FAIL→REVIEW. This prevents a self-contradictory AI
      // response from permanently blocking a question that is likely correct.
      const { results: guarded, downgradedIds } = applyContradictionGuard(
        newValidationResults,
        test.questions as GeneratedQuestion[],
      );
      if (downgradedIds.length > 0) {
        console.warn(
          `[VAL_SVC:${testId}] Contradiction guard: downgraded FAIL→REVIEW for ${downgradedIds.length} question(s): ${downgradedIds.join(', ')}`,
        );
      }
      newValidationResults = guarded;
      aiModel = aiRun.model;
      aiSummary = aiRun.validationSummary;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI validation failed';
      console.error(`[VAL_SVC:${testId}] AI error:`, msg);
      await db.generatedTest
        .update({ where: { id: testId }, data: { status: test.status } })
        .catch(() => {});
      return { ok: false, error: `AI validation failed: ${msg}`, stage: 'AI_CALL' };
    }
  } else if (detFailedIds.size > 0) {
    // Some questions failed deterministic checks; no AI needed but record those failures
    newValidationResults = detResults.filter((r) => detFailedIds.has(r.questionId));
    aiSummary = 'Deterministic checks only; all stale questions had structural failures.';
  } else {
    aiSummary = 'All questions are current — no AI validation required.';
  }

  const validationMs = Date.now() - startMs;

  // 8. Build the FULL result set by merging:
  //    - Existing CURRENT QVRs (unchanged questions)
  //    - New results for STALE/updated questions
  const currentQVRMap = new Map<string, QVRRow>(
    (existingTV?.questionResults ?? [])
      .filter((qvr) => !aiCandidateIds.has(qvr.questionId)) // keep only unchanged
      .map((qvr) => [qvr.questionId, qvr]),
  );

  const newResultMap = new Map<string, QuestionValidationInput>(
    newValidationResults.map((r) => [r.questionId, r]),
  );

  // Assemble final result per question (maintaining order)
  const allResults: Array<{
    questionId: string;
    order: number;
    status: string;
    confidence: number;
    issues: object[];
    suggestedFix: string | null;
    factualNotes: string | null;
    questionVersion: number;
    isNew: boolean;
  }> = test.questions.map((gq) => {
    const newResult = newResultMap.get(gq.id);
    if (newResult) {
      return {
        questionId: gq.id,
        order: gq.order,
        status: newResult.status,
        confidence: newResult.confidence,
        issues: newResult.issues as object[],
        suggestedFix: newResult.suggestedFix ?? null,
        factualNotes: newResult.factualNotes ?? null,
        questionVersion: gq.questionVersion,
        isNew: true,
      };
    }
    const existing = currentQVRMap.get(gq.id);
    if (existing) {
      return {
        questionId: gq.id,
        order: gq.order,
        status: existing.status,
        confidence: existing.confidence,
        issues: existing.issues as object[],
        suggestedFix: existing.suggestedFix,
        factualNotes: existing.factualNotes,
        questionVersion: existing.questionVersion,
        isNew: false,
      };
    }
    // Fallback: no result at all — should not happen, but treat as FAIL
    return {
      questionId: gq.id,
      order: gq.order,
      status: 'FAIL',
      confidence: 0,
      issues: [{ type: 'OTHER', message: 'No validation result available.', severity: 'ERROR' }],
      suggestedFix: null,
      factualNotes: null,
      questionVersion: gq.questionVersion,
      isNew: true,
    };
  });

  // 9. Compute aggregate stats
  const passed = allResults.filter((r) => r.status === 'PASS').length;
  const failed = allResults.filter((r) => r.status === 'FAIL').length;
  const reviewNeeded = allResults.filter((r) => r.status === 'REVIEW').length;

  const allPass = failed === 0 && reviewNeeded === 0;
  const overallStatus: ValidationOverallStatus = allPass ? 'READY' : 'VALIDATION_FAILED';

  const deterministicSummary =
    cleanQuestionIds.size < test.questions.length
      ? `${test.questions.length - cleanQuestionIds.size} question(s) failed structural checks. `
      : '';

  const incrementalNote = hasStaleQuestions
    ? ` [Incremental: validated ${questionsValidated}/${test.questions.length} questions]`
    : ` [All questions were current; no AI call needed]`;

  const validationSummary = deterministicSummary + aiSummary + incrementalNote;

  // 10. Write to DB:
  //     - Upsert TestValidation (create if new, update aggregate if existing)
  //     - For STALE questions: delete old QVR, insert new one (with updated questionVersion)
  //     - Current questions: no QVR change (they keep their existing rows)
  try {
    let validationId: string;

    if (!existingTV) {
      // First validation — create new TestValidation
      const tv = await db.testValidation.create({
        data: {
          testId,
          totalQuestions: test.questions.length,
          passed,
          failed,
          reviewNeeded,
          overallStatus,
          validationSummary,
          validatorModel: aiModel,
          validationMs,
          validatedAt: new Date(),
          contentVersion: test.contentVersion,
        },
      });
      validationId = tv.id;

      // Insert ALL question results (all are "new" on first run)
      await db.questionValidationResult.createMany({
        data: allResults.map((r) => ({
          validationId,
          questionId: r.questionId,
          order: r.order,
          status: r.status,
          confidence: r.confidence,
          issues: r.issues,
          suggestedFix: r.suggestedFix,
          factualNotes: r.factualNotes,
          questionVersion: r.questionVersion,
        })),
      });
    } else {
      validationId = existingTV.id;

      // Update TestValidation aggregate (keep the same record, just refresh stats)
      await db.testValidation.update({
        where: { id: validationId },
        data: {
          totalQuestions: test.questions.length,
          passed,
          failed,
          reviewNeeded,
          overallStatus,
          validationSummary,
          validatorModel: aiModel,
          validationMs,
          validatedAt: new Date(),
          contentVersion: test.contentVersion,
        },
      });

      // Delete old QVRs for stale/updated questions, then insert new ones
      if (aiCandidateIds.size > 0) {
        await db.questionValidationResult.deleteMany({
          where: {
            validationId,
            questionId: { in: [...aiCandidateIds] },
          },
        });

        const newQVRData = allResults
          .filter((r) => r.isNew)
          .map((r) => ({
            validationId,
            questionId: r.questionId,
            order: r.order,
            status: r.status,
            confidence: r.confidence,
            issues: r.issues,
            suggestedFix: r.suggestedFix,
            factualNotes: r.factualNotes,
            questionVersion: r.questionVersion,
          }));

        if (newQVRData.length > 0) {
          await db.questionValidationResult.createMany({ data: newQVRData });
        }
      }
    }

    // 11. Update test status
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
    `[VAL_SVC:${testId}] ✅ ${overallStatus} | passed=${passed} failed=${failed} review=${reviewNeeded} | validated=${questionsValidated}/${test.questions.length} | ${validationMs}ms`,
  );

  return {
    ok: true,
    overallStatus,
    passed,
    failed,
    reviewNeeded,
    validationMs,
    validationSummary,
    questionsValidated,
    staleQuestionIds,
  };
}
