/**
 * Prompt builder for the single-question repair AI call.
 *
 * Repair modes:
 *   AUTO_FIX    — Rewrite the existing question to fix the validator issue while
 *                 preserving the original learning objective.
 *   REPLACE     — Discard the question entirely and generate a fresh question on
 *                 the same topic/category/difficulty.
 *   MANUAL      — Admin provides the full replacement question as JSON.
 *                 No AI call. Data is validated deterministically and saved directly.
 *   ADMIN_SEED  — Admin provides the desired question text (and optionally options /
 *                 correct answer). AI completes the bilingual MCQ structure while
 *                 preserving the admin's question content verbatim. The admin-provided
 *                 text is authoritative and must not be replaced with a different question.
 *
 * Server-only. Never import in client components.
 */

import type { ValidationIssue } from '@/types/validation';

export type RepairMode = 'AUTO_FIX' | 'REPLACE' | 'MANUAL' | 'ADMIN_SEED';

/**
 * Partial question data provided by the admin in ADMIN_SEED mode.
 * At least one of questionText / questionEn / questionHi must be present.
 *
 * The AI will:
 *   - Use the provided question text verbatim (translate if only one language given).
 *   - Use provided options/correctOption exactly if present; generate if absent.
 *   - Generate bilingual explanations consistent with the correctOption.
 *
 * The admin's question text is authoritative. AI must not silently change it.
 */
export type AdminQuestionSeed = {
  /** Plain question text — may be in English or Hindi or both. */
  questionText?: string;
  questionHi?: string;
  questionEn?: string;
  /** Optional pre-filled options (English). AI generates missing ones. */
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  /** Optional correct answer (A–D). AI determines if omitted. Never E. */
  correctOption?: string;
  /** Optional explanation (English). AI generates if omitted. */
  explanation?: string;
  /** Optional question type hint. Defaults to same type as existing question. */
  questionType?: string;
};

export type RepairPromptContext = {
  exam: string;
  category: string;
  topic: string;
  difficulty: string;
  testTitleEn: string;

  /** Optional strict scope boundary — if present, repaired/replaced question must stay within it. */
  strictTopicScope?: string | null;
  excludeScope?: string | null;
  topicAdherenceMode?: 'STRICT' | 'NORMAL';

  /** The question being repaired. */
  question: {
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

  /** Validator feedback (may be absent if never validated). */
  validatorIssues: ValidationIssue[];
  suggestedFix: string | null;
  factualNotes: string | null;

  /** Texts of the OTHER 24 questions to avoid duplication. */
  existingQuestionTexts: string[];

  repairMode: RepairMode;
  adminInstruction: string | null;

  /**
   * ADMIN_SEED mode only.
   * Admin-provided partial question data. AI completes missing fields.
   * The admin's question text is authoritative — AI must not substitute a different question.
   */
  adminQuestion?: AdminQuestionSeed | null;
};

// The JSON shape the AI must return for a single repaired question.
const REPAIR_JSON_SCHEMA = `{
  "questionType": "<DIRECT | STATEMENT | QUOTE_ATTRIBUTION | CHRONOLOGY | MATCHING | ASSERTION_REASON>",
  "questionHi": "<Hindi question text — use \\\\n for newlines in multi-line formats>",
  "questionEn": "<English question text>",
  "optionAHi": "<Hindi option A>",
  "optionBHi": "<Hindi option B>",
  "optionCHi": "<Hindi option C>",
  "optionDHi": "<Hindi option D>",
  "optionAEn": "<English option A>",
  "optionBEn": "<English option B>",
  "optionCEn": "<English option C>",
  "optionDEn": "<English option D>",
  "explanationHi": "<Hindi explanation — 1-2 sentences>",
  "explanationEn": "<English explanation — 1-2 sentences>",
  "correctOption": "A"
}`;

export function buildRepairSystemPrompt(): string {
  return [
    'You are an expert BPSC TRE 4 exam question editor.',
    'You receive one MCQ question that has a validation issue and must repair or replace it.',
    '',
    'CRITICAL RULES — follow exactly:',
    '1. Return ONLY valid JSON. No markdown, no commentary, no code fences.',
    '2. The JSON must match the exact schema provided.',
    '3. correctOption must ONLY be one of: A, B, C, D. NEVER use E.',
    '4. Hindi and English versions must be semantically equivalent.',
    '5. Write natural Hindi — avoid machine-literal translation.',
    '6. The repaired question must be factually unambiguous with exactly one correct answer.',
    '7. Explanations must be concise — 1 to 2 sentences only.',
    '8. Do NOT duplicate any of the existing question texts listed in the prompt.',
    '9. These are PRACTICE questions — do not claim they are official BPSC questions.',
    '10. Verify your own JSON is valid before returning it.',
  ].join('\n');
}

export function buildRepairUserPrompt(ctx: RepairPromptContext): string {
  const lines: string[] = [];

  lines.push(`Repair Mode: ${ctx.repairMode}`);
  lines.push('');
  lines.push('─── Test Context ───');
  lines.push(`Exam: ${ctx.exam}`);
  lines.push(`Category: ${ctx.category}`);
  lines.push(`Topic: ${ctx.topic}`);
  lines.push(`Difficulty: ${ctx.difficulty}`);
  lines.push(`Test Title: ${ctx.testTitleEn}`);
  lines.push('');

  // Include scope context so the replacement question stays within boundaries
  if (ctx.strictTopicScope || ctx.excludeScope) {
    const mode = ctx.topicAdherenceMode ?? 'STRICT';
    lines.push('─── Topic Scope Boundary ───');
    if (ctx.strictTopicScope) {
      lines.push(`Scope (what must be covered): ${ctx.strictTopicScope}`);
    }
    if (ctx.excludeScope) {
      lines.push(`Exclude (out of scope): ${ctx.excludeScope}`);
    }
    lines.push(`Mode: ${mode}`);
    if (mode === 'STRICT') {
      lines.push('⚠️  STRICT: The repaired/replacement question MUST stay within the scope boundary above. A question outside this boundary will fail re-validation regardless of factual accuracy.');
    }
    lines.push('');
  }

  if (ctx.repairMode === 'AUTO_FIX') {
    lines.push('─── Original Question to Fix ───');
    lines.push(`Question Type: ${ctx.question.questionType}`);
    lines.push(`Hindi: ${ctx.question.questionHi}`);
    lines.push(`English: ${ctx.question.questionEn}`);
    lines.push(`Option A (Hi): ${ctx.question.optionAHi}`);
    lines.push(`Option A (En): ${ctx.question.optionAEn}`);
    lines.push(`Option B (Hi): ${ctx.question.optionBHi}`);
    lines.push(`Option B (En): ${ctx.question.optionBEn}`);
    lines.push(`Option C (Hi): ${ctx.question.optionCHi}`);
    lines.push(`Option C (En): ${ctx.question.optionCEn}`);
    lines.push(`Option D (Hi): ${ctx.question.optionDHi}`);
    lines.push(`Option D (En): ${ctx.question.optionDEn}`);
    lines.push(`Correct Answer: ${ctx.question.correctOption}`);
    lines.push(`Explanation (Hi): ${ctx.question.explanationHi}`);
    lines.push(`Explanation (En): ${ctx.question.explanationEn}`);
    lines.push('');
    lines.push('─── Validator Feedback ───');
    if (ctx.validatorIssues.length > 0) {
      ctx.validatorIssues.forEach((issue) => {
        lines.push(`[${issue.type}] ${issue.message}`);
      });
    } else {
      lines.push('No specific issue identified. Improve factual clarity and unambiguity.');
    }
    if (ctx.suggestedFix) lines.push(`Suggested fix: ${ctx.suggestedFix}`);
    if (ctx.factualNotes) lines.push(`Factual notes: ${ctx.factualNotes}`);
    lines.push('');
    lines.push('─── Instructions ───');
    lines.push(
      `Rewrite this ${ctx.question.questionType} question to fix the identified issue. ` +
      'Preserve the original learning objective and question type if possible. ' +
      'If the question type itself caused the issue, you may change to DIRECT. ' +
      'The answer must be factually unambiguous.'
    );
    if (ctx.question.questionType === 'STATEMENT') {
      lines.push('For STATEMENT questions: verify every individual statement independently before rewriting.');
    }
    if (ctx.question.questionType === 'QUOTE_ATTRIBUTION') {
      lines.push('For QUOTE_ATTRIBUTION: only use historically verified, widely accepted quotes.');
    }
    if (ctx.question.questionType === 'CHRONOLOGY') {
      lines.push('For CHRONOLOGY: verify the actual dates/years before rewriting the sequence.');
    }
    if (ctx.question.questionType === 'ASSERTION_REASON') {
      lines.push('For ASSERTION_REASON: use the exact standard Hindi/English option texts.');
    }
  } else if (ctx.repairMode === 'ADMIN_SEED') {
    // ── ADMIN_SEED: admin provides question content; AI completes missing fields ──
    const seed = ctx.adminQuestion;
    const seedText = seed?.questionText ?? seed?.questionEn ?? seed?.questionHi ?? '';

    lines.push('─── Admin-Seeded Replacement ───');
    lines.push('The admin has provided a question they want to use. Your role is to complete');
    lines.push('the full bilingual MCQ structure while preserving the admin\'s content exactly.');
    lines.push('');
    lines.push('⚠️  CRITICAL AUTHORITY RULE:');
    lines.push('  - The admin\'s question text is AUTHORITATIVE — use it verbatim.');
    lines.push('  - Do NOT change the question into a different question.');
    lines.push('  - Do NOT rephrase, simplify, or replace it with a "safer" alternative.');
    lines.push('  - If translation is needed, translate accurately and naturally.');
    lines.push('  - If options are provided, use them exactly. Do not swap or alter them.');
    lines.push('  - If correctOption is provided, treat it as the definitive answer.');
    lines.push('  - Only generate/infer fields that the admin did not provide.');
    lines.push('');

    if (seedText) {
      lines.push('─── Admin Question Text ───');
      lines.push(seedText);
      lines.push('');
    }
    if (seed?.questionHi && seed.questionHi !== seedText) {
      lines.push(`Admin Hindi: ${seed.questionHi}`);
    }
    if (seed?.questionEn && seed.questionEn !== seedText) {
      lines.push(`Admin English: ${seed.questionEn}`);
    }

    const hasOptions = seed?.optionA || seed?.optionB || seed?.optionC || seed?.optionD;
    if (hasOptions) {
      lines.push('─── Admin-Provided Options ───');
      if (seed?.optionA) lines.push(`Option A: ${seed.optionA}`);
      if (seed?.optionB) lines.push(`Option B: ${seed.optionB}`);
      if (seed?.optionC) lines.push(`Option C: ${seed.optionC}`);
      if (seed?.optionD) lines.push(`Option D: ${seed.optionD}`);
      lines.push('');
    }

    if (seed?.correctOption && ['A', 'B', 'C', 'D'].includes(seed.correctOption.toUpperCase())) {
      lines.push(`Admin Correct Answer: ${seed.correctOption.toUpperCase()}`);
      lines.push('⚠️  Treat this as the definitive correct answer. Do NOT override it.');
      lines.push('');
    }

    if (seed?.explanation) {
      lines.push(`Admin Explanation: ${seed.explanation}`);
      lines.push('');
    }

    const preferredType = seed?.questionType ?? ctx.question.questionType;
    lines.push('─── Completion Instructions ───');
    lines.push(`Preferred question type: ${preferredType} (use DIRECT if this type does not fit admin\'s content).`);
    lines.push('Complete ALL missing fields in the required JSON schema:');
    lines.push('  - questionHi: Accurate Hindi translation of the admin\'s question (if not provided).');
    lines.push('  - questionEn: Accurate English translation (if not provided).');
    lines.push('  - optionAHi–optionDHi: Hindi translations of A–D (generate missing options too).');
    lines.push('  - optionAEn–optionDEn: English options A–D.');
    lines.push('  - correctOption: The correct answer A–D (use admin\'s if provided; determine otherwise).');
    lines.push('  - explanationHi / explanationEn: 1–2 sentence explanation justifying the correct answer.');
    lines.push('Ensure exactly 4 options A–D, each non-empty and non-duplicate.');

  } else {
    // REPLACE
    const isScopeFail = ctx.validatorIssues.some((i) => i.type === 'TOPIC_SCOPE_FAIL');
    const isDuplicate = ctx.validatorIssues.some(
      (i) => i.type === 'DUPLICATE_QUESTION' || i.type === 'NEAR_DUPLICATE',
    );

    lines.push('─── Original Question Being Replaced ───');
    lines.push(`Type: ${ctx.question.questionType}`);
    lines.push(`(Removed due to validation failure: ${
      ctx.validatorIssues.map((i) => `[${i.type}] ${i.message}`).join('; ') || 'quality issue'
    })`);
    lines.push('');
    lines.push('─── Instructions ───');
    lines.push(
      `Generate a completely NEW question from the same exam/category/topic/difficulty. ` +
      `Preferred type: ${ctx.question.questionType} (or DIRECT if that type is not suitable for a fresh question). ` +
      'The new question must be factually accurate and unambiguous.',
    );

    if (isScopeFail) {
      lines.push('');
      lines.push('⚠️  SCOPE FAILURE — READ CAREFULLY:');
      lines.push('The previous question was REJECTED because it tested broader adjacent history, not the specific declared topic scope.');
      lines.push('Your replacement MUST directly test the exact topic and scope declared in the "Topic Scope Boundary" section above.');
      lines.push('Do NOT generate another general history/movement question. Every detail of the new question must be traceable to the declared topic scope.');
      lines.push('If you cannot stay within the scope, say so clearly — do not invent a vague question that merely mentions the topic name.');
    }

    if (isDuplicate) {
      lines.push('');
      lines.push('⚠️  DUPLICATE — the original question was flagged as duplicate. Your replacement must test a DIFFERENT learning objective, event, or fact than all existing questions listed below.');
    }
  }

  if (ctx.adminInstruction) {
    lines.push('');
    lines.push('─── Admin Instruction ───');
    lines.push(ctx.adminInstruction);
  }

  // Deduplication guard
  if (ctx.existingQuestionTexts.length > 0) {
    lines.push('');
    lines.push('─── DO NOT DUPLICATE These Existing Questions ───');
    ctx.existingQuestionTexts.forEach((text, i) => {
      lines.push(`${i + 1}. ${text}`);
    });
  }

  lines.push('');
  lines.push('─── Required JSON Output ───');
  lines.push('Return ONLY this exact JSON structure (no markdown, no extra keys):');
  lines.push(REPAIR_JSON_SCHEMA);

  return lines.join('\n');
}
