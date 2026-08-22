/**
 * Answer Override Service — admin manual correct-answer correction.
 *
 * Allows an admin to change the correct option on any non-PUBLISHED question
 * without triggering AI revalidation.
 *
 * Behaviour:
 *  1. Validates correctOption ∈ {A, B, C, D} (never E).
 *  2. Checks test is not PUBLISHED or ARCHIVED.
 *  3. Updates GeneratedQuestion.correctOption and answerSource = 'ADMIN_VERIFIED'.
 *  4. Increments GeneratedQuestion.questionVersion (makes old QVR stale).
 *  5. Creates a synthetic PASS QuestionValidationResult at the new version
 *     (preserving the spirit of old semantic results but marking admin authority).
 *  6. Creates a QuestionAnswerOverride audit record.
 *  7. Recalculates TestValidation aggregate stats from all current QVRs.
 *  8. Updates GeneratedTest.status if the overall result changed.
 *
 * Correctness of the answer is NOT sent back to AI — admin takes authority.
 * Structural deterministic checks (option ∈ A–D, not E, fields exist) still apply.
 *
 * Server-only. Never import in client components.
 */

import { db } from '@/lib/db';

// ─── Result types ─────────────────────────────────────────────────────────────

export type OverrideSuccess = {
  ok: true;
  questionId: string;
  newCorrectOption: string;
  newQuestionVersion: number;
  newTestStatus: string;
  overrideAuditId: string;
};

export type OverrideError = {
  ok: false;
  error: string;
  stage: 'VALIDATE' | 'LOAD' | 'STATUS_CHECK' | 'DB_WRITE';
};

export type OverrideResult = OverrideSuccess | OverrideError;

const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);
const IMMUTABLE_STATUSES = new Set(['PUBLISHED', 'ARCHIVED']);

// ─── Core override function ───────────────────────────────────────────────────

export async function overrideAnswer(
  testId: string,
  questionId: string,
  newCorrectOption: string,
  adminNote: string | undefined,
): Promise<OverrideResult> {
  // 1. Validate correctOption
  const opt = typeof newCorrectOption === 'string' ? newCorrectOption.trim().toUpperCase() : '';
  if (!VALID_OPTIONS.has(opt)) {
    return {
      ok: false,
      error: `correctOption must be A, B, C, or D (got: "${newCorrectOption}"). Option E can never be correct.`,
      stage: 'VALIDATE',
    };
  }

  // 2. Load question + test status
  let question: {
    id: string;
    testId: string;
    correctOption: string;
    questionVersion: number;
    answerSource: string;
    explanationHi: string;
    explanationEn: string;
  } | null;

  let testStatus: string | null = null;

  try {
    question = await db.generatedQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        testId: true,
        correctOption: true,
        questionVersion: true,
        answerSource: true,
        explanationHi: true,
        explanationEn: true,
      },
    }) as typeof question;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB load error';
    return { ok: false, error: `Failed to load question: ${msg}`, stage: 'LOAD' };
  }

  if (!question) {
    return { ok: false, error: `Question ${questionId} not found.`, stage: 'LOAD' };
  }

  if (question.testId !== testId) {
    return { ok: false, error: 'Question does not belong to this test.', stage: 'LOAD' };
  }

  try {
    const t = await db.generatedTest.findUnique({
      where: { id: testId },
      select: { status: true },
    });
    testStatus = t?.status ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB load error';
    return { ok: false, error: `Failed to load test: ${msg}`, stage: 'LOAD' };
  }

  if (!testStatus) {
    return { ok: false, error: `Test ${testId} not found.`, stage: 'LOAD' };
  }

  // 3. Status check — immutable tests cannot be modified
  if (IMMUTABLE_STATUSES.has(testStatus)) {
    return {
      ok: false,
      error: `${testStatus} tests are immutable. Answers cannot be overridden.`,
      stage: 'STATUS_CHECK',
    };
  }

  const previousCorrectOption = question.correctOption;

  // 4. Detect explanation inconsistency (heuristic: explanation mentions old option letter)
  const oldOptLower = previousCorrectOption.toLowerCase();
  const explHiMentionsOld =
    question.explanationHi.toLowerCase().includes(`विकल्प ${oldOptLower}`) ||
    question.explanationHi.toLowerCase().includes(`option ${oldOptLower}`);
  const explEnMentionsOld =
    question.explanationEn.toLowerCase().includes(`option ${oldOptLower}`) ||
    question.explanationEn.toLowerCase().includes(`answer is ${oldOptLower}`);
  const explanationMayBeInconsistent = explHiMentionsOld || explEnMentionsOld;

  // 5. Load existing TestValidation to compute new aggregate after override
  const existingTV = await db.testValidation.findUnique({
    where: { testId },
    select: {
      id: true,
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
      },
    },
  });

  // 6. Persist changes in DB
  try {
    // 6a. Increment question version + update correctOption + answerSource
    const updatedQuestion = await db.generatedQuestion.update({
      where: { id: questionId },
      data: {
        correctOption: opt,
        answerSource: 'ADMIN_VERIFIED',
        questionVersion: { increment: 1 },
      },
      select: { questionVersion: true },
    });
    const newQuestionVersion = updatedQuestion.questionVersion;

    // 6b. Audit record
    const overrideAudit = await db.questionAnswerOverride.create({
      data: {
        testId,
        questionId,
        previousCorrectOption,
        newCorrectOption: opt,
        adminNote: adminNote?.trim() || null,
      },
    });

    // 6c. Create synthetic PASS QVR at the new questionVersion
    //     This prevents the question from showing as NEEDS_REVALIDATION after override.
    //     The admin explicitly takes authority over correctness.
    if (existingTV) {
      // Delete any existing QVR for this question in the current validation
      await db.questionValidationResult.deleteMany({
        where: { validationId: existingTV.id, questionId },
      });

      // Get the order from existing QVR if available, else look it up
      const oldQVR = existingTV.questionResults.find((r) => r.questionId === questionId);
      const order = oldQVR?.order ?? 1;

      // Create synthetic PASS
      await db.questionValidationResult.create({
        data: {
          validationId: existingTV.id,
          questionId,
          order,
          status: 'PASS',
          confidence: 1.0,
          issues: [],
          suggestedFix: null,
          factualNotes: `Admin-verified correct answer. Set to option ${opt} by admin override. Previous AI validation: ${oldQVR?.status ?? 'none'}.`,
          questionVersion: newQuestionVersion,
        },
      });

      // 6d. Recalculate TestValidation aggregate stats
      const updatedQVRs = await db.questionValidationResult.findMany({
        where: { validationId: existingTV.id },
        select: { status: true },
      });

      const passed = updatedQVRs.filter((r) => r.status === 'PASS').length;
      const failed = updatedQVRs.filter((r) => r.status === 'FAIL').length;
      const reviewNeeded = updatedQVRs.filter((r) => r.status === 'REVIEW').length;
      const allPass = failed === 0 && reviewNeeded === 0;
      const overallStatus = allPass ? 'READY' : 'VALIDATION_FAILED';

      await db.testValidation.update({
        where: { id: existingTV.id },
        data: { passed, failed, reviewNeeded, overallStatus },
      });

      // 6e. Update test status
      await db.generatedTest.update({
        where: { id: testId },
        data: { status: overallStatus },
      });

      console.log(
        `[OVERRIDE:${testId}/${questionId}] ✅ answer overridden ${previousCorrectOption}→${opt} | v${newQuestionVersion} | ADMIN_VERIFIED | test→${overallStatus}`,
      );

      return {
        ok: true,
        questionId,
        newCorrectOption: opt,
        newQuestionVersion,
        newTestStatus: overallStatus,
        overrideAuditId: overrideAudit.id,
        ...(explanationMayBeInconsistent ? { explanationWarning: true } : {}),
      } as OverrideSuccess & { explanationWarning?: boolean };
    }

    // No existing TestValidation — just update test status to reflect change
    await db.generatedTest.update({
      where: { id: testId },
      data: { status: 'GENERATED' }, // needs validation before READY
    });

    console.log(
      `[OVERRIDE:${testId}/${questionId}] ✅ answer overridden ${previousCorrectOption}→${opt} | v${newQuestionVersion} | no prior validation`,
    );

    return {
      ok: true,
      questionId,
      newCorrectOption: opt,
      newQuestionVersion,
      newTestStatus: 'GENERATED',
      overrideAuditId: overrideAudit.id,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB write failed';
    console.error(`[OVERRIDE:${testId}/${questionId}] DB error:`, msg);
    return { ok: false, error: `Failed to save answer override: ${msg}`, stage: 'DB_WRITE' };
  }
}
