// Agent 2 – Deterministic Validator
// Runs zero-cost structural checks before AI is invoked.
// Any ERROR-severity issue marks the question FAIL immediately.

import type { GeneratedQuestion } from '@/types/generated-test';
import type {
  QuestionValidationInput,
  ValidationIssue,
  ValidationQuestionStatus,
} from '@/types/validation';

const OPTION_E_HI = 'उत्तर नहीं देना चाहता';
const OPTION_E_EN = 'I do not want to answer';
const VALID_CORRECT_OPTIONS = new Set(['A', 'B', 'C', 'D']);

const REQUIRED_STRING_FIELDS: Array<keyof GeneratedQuestion> = [
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

function err(type: ValidationIssue['type'], message: string): ValidationIssue {
  return { type, message, severity: 'ERROR' };
}

function warn(type: ValidationIssue['type'], message: string): ValidationIssue {
  return { type, message, severity: 'WARNING' };
}

export type DeterministicResult = {
  results: QuestionValidationInput[];
  /** True if at least one question has an ERROR-severity issue. */
  hasFailed: boolean;
  /** IDs of questions that passed all deterministic checks (eligible for AI). */
  cleanQuestionIds: Set<string>;
};

export function runDeterministicValidation(questions: GeneratedQuestion[]): DeterministicResult {
  const seenHi = new Map<string, number>(); // normalised text → first order seen
  const seenEn = new Map<string, number>();
  const results: QuestionValidationInput[] = [];
  let hasFailed = false;
  const cleanQuestionIds = new Set<string>();

  for (const q of questions) {
    const issues: ValidationIssue[] = [];

    // 1. Required string fields present and non-empty
    for (const field of REQUIRED_STRING_FIELDS) {
      const value = q[field] as string;
      if (!value || value.trim().length === 0) {
        issues.push(err('MISSING_FIELD', `Field "${field}" is empty or missing.`));
      }
    }

    // 2. correctOption validity
    if (!VALID_CORRECT_OPTIONS.has(q.correctOption)) {
      issues.push(
        err(
          'INVALID_CORRECT_OPTION',
          `correctOption is "${q.correctOption}" — must be A, B, C, or D.`,
        ),
      );
    }

    // 3. Option E fixed values
    if (q.optionEHi !== OPTION_E_HI) {
      issues.push(
        err('WRONG_OPTION_E', `optionEHi must be exactly "${OPTION_E_HI}".`),
      );
    }
    if (q.optionEEn !== OPTION_E_EN) {
      issues.push(
        err('WRONG_OPTION_E', `optionEEn must be exactly "${OPTION_E_EN}".`),
      );
    }

    // 4. Exact duplicate detection across the test
    const normHi = q.questionHi.trim().toLowerCase().replace(/\s+/g, ' ');
    const normEn = q.questionEn.trim().toLowerCase().replace(/\s+/g, ' ');

    const prevHi = seenHi.get(normHi);
    if (prevHi !== undefined) {
      issues.push(
        err(
          'DUPLICATE_QUESTION',
          `Hindi question text is identical to Q${prevHi}.`,
        ),
      );
    } else {
      seenHi.set(normHi, q.order);
    }

    const prevEn = seenEn.get(normEn);
    if (prevEn !== undefined) {
      issues.push(
        err(
          'DUPLICATE_QUESTION',
          `English question text is identical to Q${prevEn}.`,
        ),
      );
    } else {
      seenEn.set(normEn, q.order);
    }

    // 5. Superficial Hindi presence check (at least one Devanagari codepoint)
    const hasDevanagari = /[\u0900-\u097F]/.test(q.questionHi);
    if (!hasDevanagari) {
      issues.push(warn('MISSING_FIELD', 'questionHi contains no Devanagari characters — may not be in Hindi.'));
    }

    const hasErrors = issues.some((i) => i.severity === 'ERROR');
    if (hasErrors) hasFailed = true;
    else cleanQuestionIds.add(q.id);

    const status: ValidationQuestionStatus = hasErrors ? 'FAIL' : 'PASS';

    results.push({
      questionId: q.id,
      order: q.order,
      status,
      // Deterministic validator is 100% certain about structural errors
      confidence: hasErrors ? 1.0 : 0.95,
      issues,
      suggestedFix: null,
      factualNotes: null,
    });
  }

  return { results, hasFailed, cleanQuestionIds };
}
