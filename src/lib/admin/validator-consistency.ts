/**
 * Validator consistency utilities.
 *
 * Detects self-contradictory AI validation output — specifically the case
 * where the validator marks a question FAIL but its own suggestedFix endorses
 * the current marked correct answer.
 *
 * Example that triggered the production bug:
 *   Question: Arrange rivers in order they meet the sea (A = 1,2,3,4)
 *   AI issues: "sequence for rivers 2,3,4 is not 2,3,4"
 *   AI suggestedFix: "Correct sequence should be 1,2,3,4"
 *   → contradiction: fix = current answer → downgrade FAIL→REVIEW
 *
 * This module is pure (no DB calls) and easily unit-testable.
 *
 * Server-only. Never import in client components.
 */

import type { GeneratedQuestion } from '@/types/generated-test';
import type { QuestionValidationInput } from '@/types/validation';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize a string for fuzzy comparison: lowercase, strip punctuation, collapse spaces. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Core detection ───────────────────────────────────────────────────────────

/**
 * Returns true when a FAIL validation result is self-contradictory:
 * the validator's own suggestedFix implies the current correctOption is
 * already the right answer.
 *
 * Two heuristics (either triggers a contradiction flag):
 *
 * 1. Letter endorsement — suggestedFix explicitly names the correct option
 *    letter positively: "should be A", "option A is correct", "use A", etc.
 *
 * 2. Text overlap — suggestedFix text closely matches the correct option's
 *    English text (handles "should be 1,2,3,4" when option A = "1,2,3,4").
 *    Requires at least 8 normalised characters to avoid false positives on
 *    very short option texts.
 */
export function isContradictoryFix(
  suggestedFix: string,
  correctOption: string,
  question: GeneratedQuestion,
): boolean {
  if (!suggestedFix.trim()) return false;

  const fix = suggestedFix.toLowerCase();
  const optLower = correctOption.toLowerCase();

  // ── Heuristic 1: letter endorsement ────────────────────────────────────
  const positivePatterns = [
    `should be ${optLower}`,
    `should be option ${optLower}`,
    `option ${optLower} is correct`,
    `option ${optLower} should be`,
    `correct answer is ${optLower}`,
    `correct answer should be ${optLower}`,
    `correct option is ${optLower}`,
    `correct option should be ${optLower}`,
    `answer is ${optLower}`,
    `answer should be ${optLower}`,
    `use option ${optLower}`,
    `select option ${optLower}`,
    `select ${optLower}`,
  ];
  if (positivePatterns.some((p) => fix.includes(p))) return true;

  // ── Heuristic 2: correct option text overlap ────────────────────────────
  // E.g. optionAEn = "1, 2, 3, 4" → normalized "1 2 3 4" (7 chars)
  // suggestedFix = "Correct sequence should be 1, 2, 3, 4" → also contains "1 2 3 4"
  const correctEnKey = `option${correctOption}En` as keyof GeneratedQuestion;
  const correctEn = (question[correctEnKey] as string | undefined) ?? '';

  if (correctEn.length >= 4) {
    const normFix = normalize(suggestedFix);
    const normAnswer = normalize(correctEn);

    // Use the first 30 normalised chars of the answer as a probe substring.
    // Minimum probe length is 5 to avoid false positives on trivial option texts
    // like "Yes" or "No" (4 chars or fewer normalise to ≤3 chars).
    const probe = normAnswer.substring(0, Math.min(30, normAnswer.length));
    if (probe.length >= 5 && normFix.includes(probe)) return true;
  }

  return false;
}

// ─── Batch guard ─────────────────────────────────────────────────────────────

/**
 * Apply contradiction guard to a set of validation results.
 *
 * For each FAIL result: if the suggestedFix endorses the current correctOption,
 * downgrade status from FAIL→REVIEW and append a VALIDATOR_INCONSISTENT issue.
 *
 * This prevents a self-contradictory AI response from permanently blocking a
 * question that is likely correct. The REVIEW status ensures admin inspection
 * rather than silent PASS or hard FAIL.
 *
 * Maximum one downgrade per result — no AI loops involved.
 */
export function applyContradictionGuard(
  results: QuestionValidationInput[],
  questions: GeneratedQuestion[],
): { results: QuestionValidationInput[]; downgradedIds: string[] } {
  const questionMap = new Map<string, GeneratedQuestion>(
    questions.map((q) => [q.id, q]),
  );
  const downgradedIds: string[] = [];

  const corrected = results.map((r) => {
    if (r.status !== 'FAIL' || !r.suggestedFix) return r;
    const q = questionMap.get(r.questionId);
    if (!q) return r;

    if (isContradictoryFix(r.suggestedFix, q.correctOption, q)) {
      downgradedIds.push(r.questionId);
      return {
        ...r,
        status: 'REVIEW' as const,
        issues: [
          ...r.issues,
          {
            type: 'OTHER' as const,
            message:
              'Validator output is self-contradictory: the suggestedFix endorses the ' +
              'current marked correct answer while status was FAIL. Downgraded to REVIEW ' +
              'for admin inspection. The question may already be correct — verify manually ' +
              'or run Revalidate to get a fresh assessment.',
            severity: 'WARNING' as const,
          },
        ],
      };
    }
    return r;
  });

  return { results: corrected, downgradedIds };
}
