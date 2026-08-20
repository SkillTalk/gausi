/**
 * POST /api/admin/tests/[testId]/validate
 *
 * Agent 2 — Validator / Reviewer.
 * Triggers validation of a GENERATED (or VALIDATION_FAILED for revalidation) test.
 *
 * Flow:
 * 1. Guard: test must exist and be in GENERATED or VALIDATION_FAILED state.
 * 2. Update status → VALIDATING.
 * 3. Run deterministic checks (zero AI cost).
 * 4. Run AI checks (gpt-4o) on questions that cleared deterministic.
 * 5. Merge results → READY or VALIDATION_FAILED.
 * 6. Upsert TestValidation + QuestionValidationResult rows.
 * 7. Update GeneratedTest.status.
 * 8. Return final validation summary.
 *
 * Agent 2 NEVER publishes a test.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runDeterministicValidation } from '@/lib/admin/deterministic-validator';
import { runAIValidation, mergeValidationResults } from '@/lib/admin/ai-validator';
import type { GeneratedQuestion } from '@/types/generated-test';
import type { QuestionValidationInput, ValidationOverallStatus } from '@/types/validation';

type Params = { params: Promise<{ testId: string }> };

const VALIDATABLE_STATUSES = new Set(['GENERATED', 'VALIDATION_FAILED', 'READY']);

export async function POST(_req: Request, { params }: Params) {
  const { testId } = await params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 503 });
  }

  // ─── 1. Load test + questions ─────────────────────────────────────────────
  let test: {
    id: string;
    exam: string;
    category: string;
    topic: string;
    difficulty: string;
    status: string;
    totalQuestions: number;
    questions: GeneratedQuestion[];
  } | null;

  try {
    test = await db.generatedTest.findUnique({
      where: { id: testId },
      include: { questions: { orderBy: { order: 'asc' } } },
    }) as typeof test;
  } catch (err) {
    console.error(`[VALIDATE:${testId}] DB load error:`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load test.' }, { status: 500 });
  }

  if (!test) {
    return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
  }

  if (!VALIDATABLE_STATUSES.has(test.status)) {
    return NextResponse.json(
      {
        error: `Test status is "${test.status}". Validation requires GENERATED, VALIDATION_FAILED, or READY.`,
      },
      { status: 409 },
    );
  }

  if (test.questions.length === 0) {
    return NextResponse.json({ error: 'Test has no questions to validate.' }, { status: 422 });
  }

  // ─── 2. Mark as VALIDATING ────────────────────────────────────────────────
  try {
    await db.generatedTest.update({ where: { id: testId }, data: { status: 'VALIDATING' } });
  } catch (err) {
    console.error(`[VALIDATE:${testId}] Failed to set VALIDATING:`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to update test status.' }, { status: 500 });
  }

  const startMs = Date.now();

  // ─── 3. Deterministic checks (zero AI cost) ───────────────────────────────
  const { results: detResults, cleanQuestionIds } = runDeterministicValidation(
    test.questions as GeneratedQuestion[],
  );

  // ─── 4. AI checks on deterministically-clean questions ───────────────────
  let mergedResults: QuestionValidationInput[] = detResults;
  let aiModel: string | null = null;
  let aiSummary = '';

  const cleanQuestions = test.questions.filter((q: GeneratedQuestion) =>
    cleanQuestionIds.has(q.id),
  ) as GeneratedQuestion[];

  if (cleanQuestions.length > 0) {
    try {
      const aiRun = await runAIValidation(
        apiKey,
        cleanQuestions,
        test.exam,
        test.category,
        test.topic,
        test.difficulty,
      );
      mergedResults = mergeValidationResults(detResults, aiRun.questionResults, cleanQuestionIds);
      aiModel = aiRun.model;
      aiSummary = aiRun.validationSummary;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI validation failed';
      console.error(`[VALIDATE:${testId}] AI error:`, msg);
      // Roll back to GENERATED so admin can retry
      await db.generatedTest
        .update({ where: { id: testId }, data: { status: 'GENERATED' } })
        .catch(() => {});
      return NextResponse.json({ error: 'AI validation failed.', detail: msg }, { status: 502 });
    }
  } else {
    aiSummary = 'All questions failed deterministic checks; AI validation skipped.';
  }

  const validationMs = Date.now() - startMs;

  // ─── 5. Compute final stats ───────────────────────────────────────────────
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

  // ─── 6. Upsert validation record + question results ───────────────────────
  try {
    await db.$transaction(async (tx) => {
      // Delete previous validation results for this test (clean revalidation)
      const prev = await tx.testValidation.findUnique({ where: { testId } });
      if (prev) {
        await tx.questionValidationResult.deleteMany({ where: { validationId: prev.id } });
        await tx.testValidation.delete({ where: { id: prev.id } });
      }

      const validation = await tx.testValidation.create({
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
        },
      });

      for (const r of mergedResults) {
        await tx.questionValidationResult.create({
          data: {
            validationId: validation.id,
            questionId: r.questionId,
            order: r.order,
            status: r.status,
            confidence: r.confidence,
            issues: r.issues as object[],
            suggestedFix: r.suggestedFix,
            factualNotes: r.factualNotes,
          },
        });
      }

      // Update test status
      await tx.generatedTest.update({
        where: { id: testId },
        data: { status: overallStatus },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB write failed';
    console.error(`[VALIDATE:${testId}] Transaction failed:`, msg);
    await db.generatedTest
      .update({ where: { id: testId }, data: { status: 'GENERATED' } })
      .catch(() => {});
    return NextResponse.json({ error: 'Failed to save validation results.' }, { status: 500 });
  }

  console.log(
    `[VALIDATE:${testId}] ✅ ${overallStatus} | passed=${passed} failed=${failed} review=${reviewNeeded} | ${validationMs}ms`,
  );

  return NextResponse.json({
    testId,
    status: overallStatus,
    totalQuestions: test.questions.length,
    passed,
    failed,
    reviewNeeded,
    validationSummary,
    validationMs,
  });
}
