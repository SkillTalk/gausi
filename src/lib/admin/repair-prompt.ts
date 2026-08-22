/**
 * Prompt builder for the single-question repair AI call.
 *
 * Two repair modes:
 *   AUTO_FIX — Rewrite the existing question to fix the validator issue while
 *              preserving the original learning objective.
 *   REPLACE  — Discard the question entirely and generate a fresh question on
 *              the same topic/category/difficulty.
 *
 * Server-only. Never import in client components.
 */

import type { ValidationIssue } from '@/types/validation';

export type RepairMode = 'AUTO_FIX' | 'REPLACE';

export type RepairPromptContext = {
  exam: string;
  category: string;
  topic: string;
  difficulty: string;
  testTitleEn: string;

  /** The question being repaired. */
  question: {
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
};

// The JSON shape the AI must return for a single repaired question.
const REPAIR_JSON_SCHEMA = `{
  "questionHi": "<Hindi question text>",
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

  if (ctx.repairMode === 'AUTO_FIX') {
    lines.push('─── Original Question to Fix ───');
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
      'Rewrite this question to fix the identified issue. ' +
      'Preserve the original learning objective if possible. ' +
      'The answer must be factually unambiguous.'
    );
  } else {
    // REPLACE
    lines.push('─── Original Question Being Replaced ───');
    lines.push(`(Removed due to validation failure: ${
      ctx.validatorIssues.map((i) => `[${i.type}] ${i.message}`).join('; ') || 'quality issue'
    })`);
    lines.push('');
    lines.push('─── Instructions ───');
    lines.push(
      'Generate a completely NEW question from the same exam/category/topic/difficulty. ' +
      'Do NOT reuse the original question text. ' +
      'The new question must be factually accurate and unambiguous.'
    );
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
