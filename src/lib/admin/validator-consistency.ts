/**
 * Validator consistency utilities.
 *
 * Detects and classifies self-contradictory AI validation output — where the
 * validator marks a question FAIL but its own suggestedFix (and/or factualNotes)
 * endorses the current marked correct answer.
 *
 * Two contradiction strengths:
 *
 * STRONG — suggestedFix clearly endorses the current answer AND no independent
 *   blocking issues exist (TOPIC_SCOPE_FAIL, AMBIGUITY, etc.). Warrants an AI
 *   retry and potential normalization to PASS.
 *
 * AMBIGUOUS — suggestedFix loosely endorses the answer but independent blocking
 *   issues also exist. Warrants FAIL→REVIEW downgrade only (no auto-PASS).
 *
 * Production example (Geography, Q25):
 *   correctOption A = "1, 3, 4, 2"
 *   AI issues:      "The correct chronological order is incorrect."
 *   AI suggestedFix: "The correct answer should be 1, 3, 4, 2"
 *   → STRONG contradiction → retry → normalize to PASS
 *
 * This module is pure (no DB calls) and easily unit-testable.
 *
 * Server-only. Never import in client components.
 */

import type { GeneratedQuestion } from '@/types/generated-test';
import type { QuestionValidationInput, ValidationIssue } from '@/types/validation';

// Issue types that constitute independent blocking reasons.
// A self-contradiction cannot override these — they require genuine admin review
// or replacement, regardless of what the validator's suggestedFix says.
const INDEPENDENT_BLOCKING_TYPES = new Set([
  'TOPIC_SCOPE_FAIL',
  'AMBIGUITY',
  'NEAR_DUPLICATE',
  'TRANSLATION_MISMATCH',
  'DUPLICATE_QUESTION',
  /**
   * INVALID_ORDERING_CRITERION — The question structure itself is ambiguous.
   * Even if the validator's suggestedFix matches the current answer, the question
   * cannot be auto-PASSED because multiple correct answers may exist.
   * Recommended action: REPLACE with a structurally valid question.
   */
  'INVALID_ORDERING_CRITERION',
]);

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

// ─── Contradiction strength classification ────────────────────────────────────

/**
 * Returns true when factualNotes appear to support (not contradict) the
 * current correct answer. Uses the same text-overlap heuristics as isContradictoryFix.
 */
export function factualNotesSupportCurrentAnswer(
  factualNotes: string | null,
  correctOption: string,
  question: GeneratedQuestion,
): boolean {
  if (!factualNotes?.trim()) return false;
  return isContradictoryFix(factualNotes, correctOption, question);
}

export type ContradictionClass = 'STRONG' | 'AMBIGUOUS' | 'NONE';

/**
 * Classify the strength of a potential self-contradiction in a validation result.
 *
 * STRONG  — suggestedFix clearly endorses the current answer AND no independent
 *           blocking issues (TOPIC_SCOPE_FAIL, AMBIGUITY, NEAR_DUPLICATE, etc.)
 *           Warrants an AI retry and potential auto-PASS normalization.
 *
 * AMBIGUOUS — suggestedFix appears to endorse the current answer BUT independent
 *             blocking issues also exist.
 *             Warrants FAIL→REVIEW downgrade only (no retry or auto-PASS).
 *
 * NONE    — No evidence of self-contradiction in suggestedFix.
 */
export function classifyContradiction(
  result: QuestionValidationInput,
  question: GeneratedQuestion,
): ContradictionClass {
  if (result.status !== 'FAIL' || !result.suggestedFix) return 'NONE';

  // suggestedFix must clearly endorse current answer
  if (!isContradictoryFix(result.suggestedFix, question.correctOption, question)) return 'NONE';

  // Independent blocking issues → cannot auto-resolve (downgrade to REVIEW at most)
  const hasBlockingIssue = result.issues.some(
    (i) => INDEPENDENT_BLOCKING_TYPES.has(i.type),
  );

  return hasBlockingIssue ? 'AMBIGUOUS' : 'STRONG';
}

// ─── Issue helpers ────────────────────────────────────────────────────────────

/** Build a clean PASS QuestionValidationInput after contradiction resolution. */
export function buildResolvedPassResult(
  original: QuestionValidationInput,
  source: 'RETRY_PASS' | 'NORMALIZED',
  retryFactualNotes?: string | null,
): QuestionValidationInput {
  const note =
    source === 'RETRY_PASS'
      ? `Retry validation passed after self-contradiction resolution.${retryFactualNotes ? ` ${retryFactualNotes}` : ''}`
      : 'Validator self-contradiction resolved: both original and retry validation endorsed the current marked answer while claiming it was wrong. Normalized to PASS.';

  return {
    questionId: original.questionId,
    order: original.order,
    status: 'PASS',
    confidence: source === 'RETRY_PASS' ? 0.9 : 0.85,
    issues: [],
    suggestedFix: null,
    factualNotes: note,
  };
}

/** Build a REVIEW QuestionValidationInput for an AMBIGUOUS contradiction. */
export function buildAmbiguousReviewResult(original: QuestionValidationInput): QuestionValidationInput {
  const metaIssue: ValidationIssue = {
    type: 'OTHER',
    message:
      'Validator output appears self-contradictory (suggestedFix endorses current answer) ' +
      'but independent issues also exist. Downgraded to REVIEW for admin inspection.',
    severity: 'WARNING',
  };
  return { ...original, status: 'REVIEW', issues: [...original.issues, metaIssue] };
}

// ─── Legacy batch guard (kept for backward compat with existing tests) ────────

/**
 * @deprecated Use resolveContradictions (in validation.service.ts) instead.
 * Apply contradiction guard to a set of validation results.
 * Always downgrades FAIL→REVIEW for any detected contradiction.
 * The new flow distinguishes STRONG (retry+PASS) from AMBIGUOUS (REVIEW).
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

    const cls = classifyContradiction(r, q);
    if (cls === 'NONE') return r;

    downgradedIds.push(r.questionId);
    return cls === 'STRONG'
      ? {
          ...r,
          status: 'REVIEW' as const,
          issues: [
            ...r.issues,
            {
              type: 'OTHER' as const,
              message:
                'Validator output is self-contradictory: the suggestedFix endorses the ' +
                'current marked correct answer while status was FAIL. Downgraded to REVIEW ' +
                'for admin inspection.',
              severity: 'WARNING' as const,
            },
          ],
        }
      : buildAmbiguousReviewResult(r);
  });

  return { results: corrected, downgradedIds };
}
