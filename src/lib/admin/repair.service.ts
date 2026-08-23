/**
 * Repair Service — single-question repair/regeneration (per user requirement §2–§7).
 *
 * Repairs ONE failing question without touching any other question in the test.
 * Preserves question order, all other question data, IDs, and positions.
 *
 * After a successful repair:
 *   - The question row is updated in-place (same id, same order).
 *   - A QuestionRepairLog entry is created for auditability.
 *   - GeneratedTest.contentVersion is incremented.
 *   - Test status is set to GENERATED (old validation is now stale).
 *
 * The test must be revalidated (Agent 2) before it can be published.
 *
 * Server-only. Never import in client components.
 */

import { db } from '@/lib/db';
import {
  buildRepairSystemPrompt,
  buildRepairUserPrompt,
  type RepairMode,
  type RepairPromptContext,
} from '@/lib/admin/repair-prompt';
import { QUESTION_TYPES } from '@/types/generated-test';
import type { ValidationIssue } from '@/types/validation';

const OPENAI_MODEL = 'gpt-4o';
const OPTION_E_HI = 'उत्तर नहीं देना चाहता';
const OPTION_E_EN = 'I do not want to answer';

// Statuses that allow repair (test must not be immutable).
const REPAIRABLE_STATUSES = new Set([
  'GENERATED',
  'VALIDATION_FAILED',
  'READY',
  'VALIDATING', // allow repair even if validation is in progress (admin UI should warn)
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type { RepairMode };

export type RepairedQuestionData = {
  questionType: string;
  questionHi: string;
  questionEn: string;
  optionAHi: string;
  optionBHi: string;
  optionCHi: string;
  optionDHi: string;
  optionAEn: string;
  optionBEn: string;
  optionCEn: string;
  optionDEn: string;
  explanationHi: string;
  explanationEn: string;
  correctOption: string;
};

export type RepairSuccess = {
  ok: true;
  questionId: string;
  repairLogId: string;
  repairedQuestion: RepairedQuestionData;
};

export type RepairFailure = {
  ok: false;
  error: string;
  stage: 'LOAD' | 'STATUS_CHECK' | 'AI_CALL' | 'STRUCT_CHECK' | 'DB_WRITE' | 'MANUAL_PARSE';
};

export type RepairResult = RepairSuccess | RepairFailure;

// ─── Structural validation ────────────────────────────────────────────────────

const REQUIRED_TEXT_FIELDS: (keyof RepairedQuestionData)[] = [
  'questionHi',
  'questionEn',
  'optionAHi',
  'optionBHi',
  'optionCHi',
  'optionDHi',
  'optionAEn',
  'optionBEn',
  'optionCEn',
  'optionDEn',
  'explanationHi',
  'explanationEn',
];

const VALID_QUESTION_TYPES = new Set<string>(QUESTION_TYPES);

export function validateRepairedQuestion(
  q: Record<string, unknown>,
  /** Texts of all OTHER questions (Hindi + English) to check for duplicates. */
  existingTexts: string[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all required text fields
  for (const field of REQUIRED_TEXT_FIELDS) {
    const val = q[field];
    if (!val || typeof val !== 'string' || !val.trim()) {
      errors.push(`${field} is required and must be a non-empty string.`);
    }
  }

  // correctOption must be A–D
  const co = typeof q.correctOption === 'string' ? q.correctOption.trim().toUpperCase() : '';
  if (!['A', 'B', 'C', 'D'].includes(co)) {
    errors.push(`correctOption must be A, B, C, or D (got: "${String(q.correctOption ?? '')}")`);
  }

  // questionType — must be a known value if present; defaults to DIRECT if absent
  const qt = q.questionType;
  if (qt !== undefined && qt !== null && typeof qt === 'string' && !VALID_QUESTION_TYPES.has(qt)) {
    errors.push(`questionType "${qt}" is not a valid type.`);
  }

  // Duplicate question text check
  const qHi = typeof q.questionHi === 'string' ? q.questionHi.trim().toLowerCase() : '';
  const qEn = typeof q.questionEn === 'string' ? q.questionEn.trim().toLowerCase() : '';
  for (const existing of existingTexts) {
    const ex = existing.trim().toLowerCase();
    if (ex && (ex === qHi || ex === qEn)) {
      errors.push('Repaired question text duplicates an existing question in this test.');
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Core repair function ─────────────────────────────────────────────────────

export async function repairQuestion(
  testId: string,
  questionId: string,
  repairMode: RepairMode,
  adminInstruction: string | undefined,
  apiKey: string,
): Promise<RepairResult> {
  // ── 1. Load test + all questions ─────────────────────────────────────────
  let test: {
    id: string;
    exam: string;
    category: string;
    topic: string;
    difficulty: string;
    titleEn: string;
    status: string;
    contentVersion: number;
    strictTopicScope: string | null;
    excludeScope: string | null;
    topicAdherenceMode: string | null;
    questions: Array<{
      id: string;
      order: number;
      questionType: string;
      questionHi: string;
      questionEn: string;
      optionAHi: string;
      optionBHi: string;
      optionCHi: string;
      optionDHi: string;
      optionEHi: string;
      optionAEn: string;
      optionBEn: string;
      optionCEn: string;
      optionDEn: string;
      optionEEn: string;
      explanationHi: string;
      explanationEn: string;
      correctOption: string;
      category: string;
      topic: string;
      difficulty: string;
    }>;
  } | null;

  try {
    test = await db.generatedTest.findUnique({
      where: { id: testId },
      include: { questions: { orderBy: { order: 'asc' } } },
    }) as typeof test;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB load error';
    return { ok: false, error: `Failed to load test: ${msg}`, stage: 'LOAD' };
  }

  if (!test) {
    return { ok: false, error: `Test not found: ${testId}`, stage: 'LOAD' };
  }

  // ── 2. Status check ───────────────────────────────────────────────────────
  if (test.status === 'PUBLISHED') {
    return {
      ok: false,
      error: 'Published tests are immutable. Archive and create a new revision if a correction is needed.',
      stage: 'STATUS_CHECK',
    };
  }

  if (test.status === 'ARCHIVED') {
    return {
      ok: false,
      error: 'Archived tests cannot be repaired.',
      stage: 'STATUS_CHECK',
    };
  }

  if (!REPAIRABLE_STATUSES.has(test.status)) {
    return {
      ok: false,
      error: `Test status "${test.status}" does not allow repair. Must be GENERATED, VALIDATION_FAILED, or READY.`,
      stage: 'STATUS_CHECK',
    };
  }

  // ── 3. Find the specific question ─────────────────────────────────────────
  const targetQuestion = test.questions.find((q) => q.id === questionId);
  if (!targetQuestion) {
    return {
      ok: false,
      error: `Question ${questionId} not found in test ${testId}.`,
      stage: 'LOAD',
    };
  }

  // ── 4. Load validation result for this question (optional) ───────────────
  let valIssues: ValidationIssue[] = [];
  let suggestedFix: string | null = null;
  let factualNotes: string | null = null;
  let qValStatus: string | null = null;

  try {
    const testValidation = await db.testValidation.findUnique({ where: { testId } });
    if (testValidation) {
      const qv = await db.questionValidationResult.findFirst({
        where: { validationId: testValidation.id, questionId },
        // Use highest questionVersion — the latest-validated row is most authoritative
        // if duplicate QVRs exist for the same question (e.g. after partial write retry).
        orderBy: { questionVersion: 'desc' },
      });
      if (qv) {
        valIssues = (qv.issues as ValidationIssue[]) ?? [];
        suggestedFix = qv.suggestedFix;
        factualNotes = qv.factualNotes;
        qValStatus = qv.status;
      }
    }
  } catch {
    // Validation result unavailable — proceed without context.
  }

  // PASS question rules:
  //   REPLACE → allowed (admin editorial override — question may be too easy, repetitive, etc.)
  //   AUTO_FIX → blocked (nothing to fix in a passing question)
  //   MANUAL → blocked (MANUAL is for broken content; use REPLACE for editorial changes)
  if (qValStatus === 'PASS' && repairMode !== 'REPLACE') {
    return {
      ok: false,
      error:
        repairMode === 'AUTO_FIX'
          ? 'This question passed validation. AUTO_FIX is not permitted on PASS questions. Use REPLACE for an admin editorial replacement.'
          : 'This question passed validation. Only REPLACE mode is allowed as an admin editorial override on PASS questions.',
      stage: 'STATUS_CHECK',
    };
  }

  // ── 5. Build existing question texts for deduplication ───────────────────
  const existingTexts = test.questions
    .filter((q) => q.id !== questionId)
    .flatMap((q) => [q.questionHi, q.questionEn]);

  // ── 6. Build repair context ───────────────────────────────────────────────
  const ctx: RepairPromptContext = {
    exam: test.exam,
    category: test.category,
    topic: test.topic,
    difficulty: test.difficulty,
    testTitleEn: test.titleEn,
    strictTopicScope: test.strictTopicScope,
    excludeScope: test.excludeScope,
    topicAdherenceMode: (test.topicAdherenceMode === 'NORMAL' ? 'NORMAL' : 'STRICT'),
    question: {
      ...targetQuestion,
      questionType: targetQuestion.questionType ?? 'DIRECT',
    },
    validatorIssues: valIssues,
    suggestedFix,
    factualNotes,
    existingQuestionTexts: existingTexts,
    repairMode,
    adminInstruction: adminInstruction ?? null,
  };

  // ── 7. MANUAL mode: parse adminInstruction as JSON, skip AI ─────────────
  if (repairMode === 'MANUAL') {
    if (!adminInstruction || !adminInstruction.trim()) {
      return {
        ok: false,
        error: 'MANUAL mode requires adminInstruction containing the full replacement question as JSON.',
        stage: 'MANUAL_PARSE',
      };
    }
    let manualData: Record<string, unknown>;
    try {
      manualData = JSON.parse(adminInstruction) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        error: 'MANUAL mode: adminInstruction must be valid JSON with all question fields.',
        stage: 'MANUAL_PARSE',
      };
    }

    const manualCheck = validateRepairedQuestion(manualData, existingTexts);
    if (!manualCheck.valid) {
      return {
        ok: false,
        error: `MANUAL question failed structural validation: ${manualCheck.errors.join('; ')}`,
        stage: 'STRUCT_CHECK',
      };
    }

    const rawQTypeM = typeof manualData.questionType === 'string' ? manualData.questionType.trim() : '';
    const repairedManual: RepairedQuestionData = {
      questionType: VALID_QUESTION_TYPES.has(rawQTypeM) ? rawQTypeM : (targetQuestion.questionType ?? 'DIRECT'),
      questionHi: (manualData.questionHi as string).trim(),
      questionEn: (manualData.questionEn as string).trim(),
      optionAHi: (manualData.optionAHi as string).trim(),
      optionBHi: (manualData.optionBHi as string).trim(),
      optionCHi: (manualData.optionCHi as string).trim(),
      optionDHi: (manualData.optionDHi as string).trim(),
      optionAEn: (manualData.optionAEn as string).trim(),
      optionBEn: (manualData.optionBEn as string).trim(),
      optionCEn: (manualData.optionCEn as string).trim(),
      optionDEn: (manualData.optionDEn as string).trim(),
      explanationHi: (manualData.explanationHi as string).trim(),
      explanationEn: (manualData.explanationEn as string).trim(),
      correctOption: (manualData.correctOption as string).trim().toUpperCase(),
    };

    // Persist manual repair
    try {
      const previousSnapshot = {
        id: targetQuestion.id,
        order: targetQuestion.order,
        category: targetQuestion.category,
        topic: targetQuestion.topic,
        difficulty: targetQuestion.difficulty,
        questionHi: targetQuestion.questionHi,
        questionEn: targetQuestion.questionEn,
        optionAHi: targetQuestion.optionAHi,
        optionBHi: targetQuestion.optionBHi,
        optionCHi: targetQuestion.optionCHi,
        optionDHi: targetQuestion.optionDHi,
        optionEHi: targetQuestion.optionEHi,
        optionAEn: targetQuestion.optionAEn,
        optionBEn: targetQuestion.optionBEn,
        optionCEn: targetQuestion.optionCEn,
        optionDEn: targetQuestion.optionDEn,
        optionEEn: targetQuestion.optionEEn,
        explanationHi: targetQuestion.explanationHi,
        explanationEn: targetQuestion.explanationEn,
        correctOption: targetQuestion.correctOption,
      };

      const repairLog = await db.questionRepairLog.create({
        data: {
          testId,
          questionId,
          repairMode: 'MANUAL',
          previousSnapshot,
          repairedSnapshot: { ...previousSnapshot, ...repairedManual, optionEHi: OPTION_E_HI, optionEEn: OPTION_E_EN },
          validatorIssue: valIssues.map((i) => `[${i.type}] ${i.message}`).join('\n') || null,
          suggestedFix,
          adminInstruction: '(MANUAL mode — full JSON provided)',
          model: 'MANUAL',
        },
      });

      await db.generatedQuestion.update({
        where: { id: questionId },
        data: {
          questionType: repairedManual.questionType,
          questionHi: repairedManual.questionHi,
          questionEn: repairedManual.questionEn,
          optionAHi: repairedManual.optionAHi,
          optionBHi: repairedManual.optionBHi,
          optionCHi: repairedManual.optionCHi,
          optionDHi: repairedManual.optionDHi,
          optionEHi: OPTION_E_HI,
          optionAEn: repairedManual.optionAEn,
          optionBEn: repairedManual.optionBEn,
          optionCEn: repairedManual.optionCEn,
          optionDEn: repairedManual.optionDEn,
          optionEEn: OPTION_E_EN,
          explanationHi: repairedManual.explanationHi,
          explanationEn: repairedManual.explanationEn,
          correctOption: repairedManual.correctOption,
          questionVersion: { increment: 1 }, // per-question versioning: only this question advances
          answerSource: 'AI_VALIDATED',       // repair resets source (MANUAL still uses AI JSON struct)
        },
      });

      await db.generatedTest.update({
        where: { id: testId },
        data: {
          contentVersion: { increment: 1 },
          status: 'GENERATED',
        },
      });

      return { ok: true, questionId, repairLogId: repairLog.id, repairedQuestion: repairedManual };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'DB write failed';
      return { ok: false, error: `Failed to save MANUAL repair: ${msg}`, stage: 'DB_WRITE' };
    }
  }

  // ── 8. Call OpenAI (AUTO_FIX / REPLACE) ──────────────────────────────────

  /**
   * One focused AI call for the repair. Returns the parsed JSON object from the AI.
   * Throws on network/parse error.
   */
  async function callRepairAI(promptCtx: RepairPromptContext): Promise<Record<string, unknown>> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: buildRepairSystemPrompt() },
          { role: 'user', content: buildRepairUserPrompt(promptCtx) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI returned ${response.status}: ${errText.slice(0, 200)}`);
    }

    type OAResp = { choices: Array<{ message: { content: string } }> };
    const data = await response.json() as OAResp;
    const raw = data.choices?.[0]?.message?.content ?? '';
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error('OpenAI returned invalid JSON for repaired question.');
    }
  }

  let rawAI: Record<string, unknown>;
  try {
    rawAI = await callRepairAI(ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI call failed';
    return { ok: false, error: `Repair AI call failed: ${msg}`, stage: 'AI_CALL' };
  }

  // ── 9. Structural validation — with one duplicate retry for AUTO_FIX ───────
  //
  // If the ONLY failure is "duplicates an existing question", attempt exactly
  // ONE retry with explicit deduplication feedback before giving up.
  // This keeps the retry budget minimal and avoids an AI loop.

  function isDuplicateOnlyFailure(errors: string[]): boolean {
    return errors.length > 0 && errors.every((e) => e.toLowerCase().includes('duplicate'));
  }

  let structCheck = validateRepairedQuestion(rawAI, existingTexts);

  if (!structCheck.valid && isDuplicateOnlyFailure(structCheck.errors) && ctx.repairMode === 'AUTO_FIX') {
    // Build retry context with explicit deduplication feedback
    const retryInstruction =
      'Your previous response duplicated an existing question in this test. ' +
      'Produce a materially different question that directly tests the same learning objective ' +
      'but uses a completely different angle, event, or fact. ' +
      'Do not use the same key terms, dates, or answer from the original question.' +
      (ctx.adminInstruction ? `\n\nOriginal instruction: ${ctx.adminInstruction}` : '');

    const retryCtx: RepairPromptContext = { ...ctx, adminInstruction: retryInstruction };

    try {
      rawAI = await callRepairAI(retryCtx);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI call failed on retry';
      return { ok: false, error: `Repair AI retry failed: ${msg}`, stage: 'AI_CALL' };
    }

    structCheck = validateRepairedQuestion(rawAI, existingTexts);

    // If retry STILL duplicates, give a clear actionable error
    if (!structCheck.valid && isDuplicateOnlyFailure(structCheck.errors)) {
      return {
        ok: false,
        error:
          'Auto Fix produced a duplicate question twice. ' +
          'Use "Replace with New" to generate a completely fresh question on this topic.',
        stage: 'STRUCT_CHECK',
      };
    }
  }

  if (!structCheck.valid) {
    return {
      ok: false,
      error: `Repaired question failed structural validation: ${structCheck.errors.join('; ')}`,
      stage: 'STRUCT_CHECK',
    };
  }

  // Build the clean repaired question (server always enforces option E)
  const rawQType = typeof rawAI.questionType === 'string' ? rawAI.questionType.trim() : '';
  const repaired: RepairedQuestionData = {
    questionType: VALID_QUESTION_TYPES.has(rawQType) ? rawQType : (targetQuestion.questionType ?? 'DIRECT'),
    questionHi: (rawAI.questionHi as string).trim(),
    questionEn: (rawAI.questionEn as string).trim(),
    optionAHi: (rawAI.optionAHi as string).trim(),
    optionBHi: (rawAI.optionBHi as string).trim(),
    optionCHi: (rawAI.optionCHi as string).trim(),
    optionDHi: (rawAI.optionDHi as string).trim(),
    optionAEn: (rawAI.optionAEn as string).trim(),
    optionBEn: (rawAI.optionBEn as string).trim(),
    optionCEn: (rawAI.optionCEn as string).trim(),
    optionDEn: (rawAI.optionDEn as string).trim(),
    explanationHi: (rawAI.explanationHi as string).trim(),
    explanationEn: (rawAI.explanationEn as string).trim(),
    correctOption: (rawAI.correctOption as string).trim().toUpperCase(),
  };

  // ── 10. Persist: audit log + question update + contentVersion ────────────
  try {
    // 9a. Audit log — snapshot before and after
    const previousSnapshot = {
      id: targetQuestion.id,
      order: targetQuestion.order,
      category: targetQuestion.category,
      topic: targetQuestion.topic,
      difficulty: targetQuestion.difficulty,
      questionHi: targetQuestion.questionHi,
      questionEn: targetQuestion.questionEn,
      optionAHi: targetQuestion.optionAHi,
      optionBHi: targetQuestion.optionBHi,
      optionCHi: targetQuestion.optionCHi,
      optionDHi: targetQuestion.optionDHi,
      optionEHi: targetQuestion.optionEHi,
      optionAEn: targetQuestion.optionAEn,
      optionBEn: targetQuestion.optionBEn,
      optionCEn: targetQuestion.optionCEn,
      optionDEn: targetQuestion.optionDEn,
      optionEEn: targetQuestion.optionEEn,
      explanationHi: targetQuestion.explanationHi,
      explanationEn: targetQuestion.explanationEn,
      correctOption: targetQuestion.correctOption,
    };

    const repairedSnapshot = {
      ...previousSnapshot,
      ...repaired,
      optionEHi: OPTION_E_HI,
      optionEEn: OPTION_E_EN,
    };

    const repairLog = await db.questionRepairLog.create({
      data: {
        testId,
        questionId,
        repairMode,
        previousSnapshot,
        repairedSnapshot,
        validatorIssue: valIssues.map((i) => `[${i.type}] ${i.message}`).join('\n') || null,
        suggestedFix,
        adminInstruction: adminInstruction ?? null,
        model: OPENAI_MODEL,
      },
    });

    // 9b. Update the question in-place (same id, same order — only content changes)
    await db.generatedQuestion.update({
      where: { id: questionId },
      data: {
        questionType: repaired.questionType,
        questionHi: repaired.questionHi,
        questionEn: repaired.questionEn,
        optionAHi: repaired.optionAHi,
        optionBHi: repaired.optionBHi,
        optionCHi: repaired.optionCHi,
        optionDHi: repaired.optionDHi,
        optionEHi: OPTION_E_HI, // always server-enforced
        optionAEn: repaired.optionAEn,
        optionBEn: repaired.optionBEn,
        optionCEn: repaired.optionCEn,
        optionDEn: repaired.optionDEn,
        optionEEn: OPTION_E_EN, // always server-enforced
        explanationHi: repaired.explanationHi,
        explanationEn: repaired.explanationEn,
        correctOption: repaired.correctOption,
        questionVersion: { increment: 1 }, // per-question versioning: only this question advances
        answerSource: 'AI_VALIDATED',       // AI produced the content; reset any prior admin override
      },
    });

    // 9c. Increment contentVersion + reset status to GENERATED
    //     (old TestValidation is now stale — test must be revalidated before publishing)
    await db.generatedTest.update({
      where: { id: testId },
      data: {
        contentVersion: { increment: 1 },
        status: 'GENERATED',
      },
    });

    return {
      ok: true,
      questionId,
      repairLogId: repairLog.id,
      repairedQuestion: repaired,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB write failed';
    return { ok: false, error: `Failed to save repaired question: ${msg}`, stage: 'DB_WRITE' };
  }
}
