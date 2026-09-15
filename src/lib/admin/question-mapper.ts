/**
 * Shared pure mapper: AIQuestion → GeneratedQuestion DB row.
 *
 * Extracted from generation.service.ts so that both the Custom Practice path
 * and the Full Subject Test (80Q batch) path share identical mapping logic,
 * Option E constants, and correctOption normalisation.
 *
 * Server-only. Never import in client components.
 */

import type { AIQuestion } from '@/types/generated-test';

// ─── Option E constants ───────────────────────────────────────────────────────

/**
 * Option E is always hardcoded on the server — AI output never contributes
 * this text. correctOption is validated to be A–D only before any DB write,
 * so option E can never be the correct answer.
 */
export const OPTION_E_HI = 'उत्तर नहीं देना चाहता';
export const OPTION_E_EN = 'I do not want to answer';

// ─── Row type ─────────────────────────────────────────────────────────────────

/**
 * Shape of one row accepted by db.generatedQuestion.createMany().
 * Optional Prisma-default fields (questionVersion, answerSource, createdAt) are
 * intentionally omitted — Prisma fills them with safe defaults.
 */
export type MappedQuestionRow = {
  testId: string;
  order: number;
  category: string;
  topic: string;
  difficulty: string;
  questionType: string;
  questionHi: string;
  optionAHi: string;
  optionBHi: string;
  optionCHi: string;
  optionDHi: string;
  optionEHi: string;
  explanationHi: string;
  questionEn: string;
  optionAEn: string;
  optionBEn: string;
  optionCEn: string;
  optionDEn: string;
  optionEEn: string;
  explanationEn: string;
  correctOption: string;
};

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Maps one AI-generated question to a DB row ready for createMany().
 *
 * Invariants enforced here (in addition to validateAIOutput pre-checks):
 *   - optionEHi / optionEEn are always the hardcoded constants.
 *     AI output for option E is silently ignored — the field is not in AIQuestion.
 *   - correctOption is normalised to uppercase. validateAIOutput already confirmed
 *     it is one of A, B, C, D — this call preserves that invariant.
 *   - overrideOrder replaces q.order when supplied. The batch generation service
 *     always passes an explicit order (batchOffset + local position) so that
 *     final orders are 1–80 regardless of what the AI returned.
 */
export function mapAIQuestionToDBRow(
  q: AIQuestion,
  testId: string,
  overrideOrder?: number,
): MappedQuestionRow {
  return {
    testId,
    order: overrideOrder ?? q.order,
    category: q.category.trim(),
    topic: q.topic.trim(),
    difficulty: q.difficulty.trim(),
    questionType: q.questionType?.trim() ?? 'DIRECT',
    questionHi: q.questionHi.trim(),
    optionAHi: q.optionAHi.trim(),
    optionBHi: q.optionBHi.trim(),
    optionCHi: q.optionCHi.trim(),
    optionDHi: q.optionDHi.trim(),
    optionEHi: OPTION_E_HI,
    explanationHi: q.explanationHi.trim(),
    questionEn: q.questionEn.trim(),
    optionAEn: q.optionAEn.trim(),
    optionBEn: q.optionBEn.trim(),
    optionCEn: q.optionCEn.trim(),
    optionDEn: q.optionDEn.trim(),
    optionEEn: OPTION_E_EN,
    explanationEn: q.explanationEn.trim(),
    correctOption: q.correctOption.trim().toUpperCase(),
  };
}
