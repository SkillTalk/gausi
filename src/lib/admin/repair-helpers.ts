/**
 * Shared helpers for the single-question repair flow.
 * Usable in both server and client contexts.
 */

import type { StoredQuestionValidation, ValidationIssue } from '@/types/validation';

/**
 * Returns true when a question validation result warrants a repair action,
 * regardless of the overall status field.
 *
 * Why this exists:
 *   The AI validator can inconsistently mark a question status=PASS while still
 *   embedding TOPIC_SCOPE_FAIL or DUPLICATE_QUESTION issue types. This helper
 *   catches those cases so the repair button always appears for actionable issues.
 */
export function isRepairableValidationResult(qVal: StoredQuestionValidation): boolean {
  if (qVal.status === 'FAIL' || qVal.status === 'REVIEW') return true;
  const issues = qVal.issues as ValidationIssue[];
  return issues.some(
    (i) =>
      i.type === 'TOPIC_SCOPE_FAIL' ||
      i.type === 'INVALID_ORDERING_CRITERION' ||
      i.type === 'DUPLICATE_QUESTION' ||
      i.type === 'NEAR_DUPLICATE' ||
      i.severity === 'ERROR',
  );
}

/**
 * Returns the recommended default repair mode for a question validation result.
 *
 * REPLACE is the default for:
 *   - TOPIC_SCOPE_FAIL: rewriting an out-of-scope question often produces a weak result.
 *   - INVALID_ORDERING_CRITERION: the question structure is ambiguous; Auto Fix cannot
 *     introduce a valid ordering criterion without fundamentally changing the question.
 *
 * AUTO_FIX is the default for all other repairable issues (factual errors, etc.).
 */
export function defaultRepairMode(qVal: StoredQuestionValidation): 'AUTO_FIX' | 'REPLACE' {
  const issues = qVal.issues as ValidationIssue[];
  const needsReplace = issues.some(
    (i) => i.type === 'TOPIC_SCOPE_FAIL' || i.type === 'INVALID_ORDERING_CRITERION',
  );
  return needsReplace ? 'REPLACE' : 'AUTO_FIX';
}
