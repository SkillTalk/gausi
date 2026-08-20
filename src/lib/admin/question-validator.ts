/**
 * Structural validator for AI-generated question arrays.
 * Does NOT perform factual/semantic validation — that is Agent 2's job.
 *
 * Checks performed (per spec requirement §8):
 *  - Correct question count
 *  - Required fields present and non-empty
 *  - A/B/C/D/E options present (A-D from AI, E hardcoded)
 *  - correctOption is A/B/C/D only (never E)
 *  - No duplicate order numbers
 *  - No empty question/option/explanation text
 *  - JSON shape valid
 */

import type { AIQuestion, AIGenerationResult, ValidationResult, ValidationError } from '@/types/generated-test';

const VALID_CORRECT_OPTIONS = new Set(['A', 'B', 'C', 'D']);
const STRING_FIELDS_PER_QUESTION: (keyof AIQuestion)[] = [
  'questionHi', 'questionEn',
  'optionAHi', 'optionBHi', 'optionCHi', 'optionDHi',
  'optionAEn', 'optionBEn', 'optionCEn', 'optionDEn',
  'explanationHi', 'explanationEn',
  'category', 'topic', 'difficulty',
];

export function validateAIOutput(
  result: unknown,
  expectedCount: number
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!result || typeof result !== 'object') {
    return { valid: false, errors: [{ field: 'root', message: 'AI response is not a JSON object.' }] };
  }

  const r = result as Record<string, unknown>;

  // titleHi / titleEn
  if (typeof r.titleHi !== 'string' || r.titleHi.trim().length === 0) {
    errors.push({ field: 'titleHi', message: 'titleHi is missing or empty.' });
  }
  if (typeof r.titleEn !== 'string' || r.titleEn.trim().length === 0) {
    errors.push({ field: 'titleEn', message: 'titleEn is missing or empty.' });
  }

  // questions array
  if (!Array.isArray(r.questions)) {
    errors.push({ field: 'questions', message: 'questions must be an array.' });
    return { valid: false, errors };
  }

  if (r.questions.length !== expectedCount) {
    errors.push({
      field: 'questions.length',
      message: `Expected ${expectedCount} questions, got ${r.questions.length}.`,
    });
  }

  const seenOrders = new Set<number>();

  for (let i = 0; i < r.questions.length; i++) {
    const q = r.questions[i] as Record<string, unknown>;
    const prefix = `questions[${i}]`;

    if (!q || typeof q !== 'object') {
      errors.push({ field: prefix, message: 'Question is not an object.' });
      continue;
    }

    // order
    if (typeof q.order !== 'number' || !Number.isInteger(q.order) || q.order < 1) {
      errors.push({ field: `${prefix}.order`, message: 'order must be a positive integer.' });
    } else {
      if (seenOrders.has(q.order as number)) {
        errors.push({ field: `${prefix}.order`, message: `Duplicate order number: ${q.order}.` });
      }
      seenOrders.add(q.order as number);
    }

    // correctOption — must be A/B/C/D, never E
    if (typeof q.correctOption !== 'string') {
      errors.push({ field: `${prefix}.correctOption`, message: 'correctOption must be a string.' });
    } else if (!VALID_CORRECT_OPTIONS.has(q.correctOption)) {
      errors.push({
        field: `${prefix}.correctOption`,
        message: `correctOption "${q.correctOption}" is invalid. Must be A, B, C, or D.`,
      });
    }

    // Required string fields
    for (const field of STRING_FIELDS_PER_QUESTION) {
      const val = q[field];
      if (typeof val !== 'string' || val.trim().length === 0) {
        errors.push({ field: `${prefix}.${field}`, message: `${field} is missing or empty.` });
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true };
}

export function isValidAIOutput(result: unknown): result is AIGenerationResult {
  return validateAIOutput(result, (result as AIGenerationResult)?.questions?.length ?? 0).valid;
}
