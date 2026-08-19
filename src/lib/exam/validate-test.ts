import type { ExamTest, OptionKey } from '@/types/exam';

type ValidationError = string;

const VALID_OPTIONS: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];
const VALID_CORRECT: OptionKey[] = ['A', 'B', 'C', 'D'];

/** Validates a test at runtime/build time. Returns array of error strings. */
export function validateTest(test: ExamTest): ValidationError[] {
  const errors: ValidationError[] = [];
  const { config, questions } = test;

  if (questions.length !== config.totalQuestions) {
    errors.push(
      `Expected ${config.totalQuestions} questions, found ${questions.length}`
    );
  }

  const ids = new Set<string>();
  for (const q of questions) {
    if (ids.has(q.id)) {
      errors.push(`Duplicate question ID: ${q.id}`);
    }
    ids.add(q.id);

    if (!q.hi?.question?.trim()) errors.push(`[${q.id}] Missing Hindi question`);
    if (!q.en?.question?.trim()) errors.push(`[${q.id}] Missing English question`);
    if (!q.category?.trim()) errors.push(`[${q.id}] Missing category`);

    if (!VALID_CORRECT.includes(q.correctOption)) {
      errors.push(`[${q.id}] correctOption "${q.correctOption}" must be A/B/C/D`);
    }

    for (const lang of ['hi', 'en'] as const) {
      const t = q[lang];
      for (const opt of VALID_OPTIONS) {
        if (!t?.options?.[opt]?.trim()) {
          errors.push(`[${q.id}] Missing ${lang} option ${opt}`);
        }
      }
      if (!t?.explanation?.trim()) {
        errors.push(`[${q.id}] Missing ${lang} explanation`);
      }
    }
  }

  return errors;
}

/** Throws if the test has validation errors. Use in tests/build scripts. */
export function assertTestValid(test: ExamTest): void {
  const errors = validateTest(test);
  if (errors.length > 0) {
    throw new Error(`Test "${test.id}" has ${errors.length} validation error(s):\n${errors.join('\n')}`);
  }
}
