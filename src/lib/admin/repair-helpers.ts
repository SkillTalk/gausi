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
      i.type === 'DUPLICATE_QUESTION' ||
      i.type === 'NEAR_DUPLICATE' ||
      i.severity === 'ERROR',
  );
}
