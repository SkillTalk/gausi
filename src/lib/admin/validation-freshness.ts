/**
 * Validation freshness helpers.
 *
 * Two complementary freshness checks:
 *
 * 1. TEST-LEVEL (legacy): computeValidationFreshness — checks whether the
 *    GeneratedTest.contentVersion > TestValidation.contentVersion, i.e. whether
 *    any question was changed since the overall snapshot was taken.
 *
 * 2. QUESTION-LEVEL (primary): computeStaleQuestions — compares each question's
 *    questionVersion against the corresponding QuestionValidationResult.questionVersion.
 *    A question is STALE when no matching QVR exists or the versions differ.
 *    This is the authoritative signal for incremental revalidation.
 *
 * This module is pure (no DB calls) so it is easy to unit-test.
 */

export type ValidationFreshnessResult = {
  /** True when GeneratedTest.contentVersion > TestValidation.contentVersion */
  isStale: boolean;
  /**
   * Deduplicated list of questionIds repaired after validatedAt.
   * @deprecated Prefer staleQuestionIds from computeStaleQuestions.
   */
  repairedQuestionIds: string[];
};

export type RepairLogEntry = {
  questionId: string;
  createdAt: Date;
};

/**
 * Compute whether a TestValidation snapshot is stale and which questions were
 * repaired since it was taken. (Legacy test-level freshness check.)
 *
 * @param testContentVersion        Current GeneratedTest.contentVersion
 * @param validationContentVersion  TestValidation.contentVersion (snapshot)
 * @param repairLogs                All QuestionRepairLog rows for this test
 * @param validatedAt               TestValidation.validatedAt date
 */
export function computeValidationFreshness(
  testContentVersion: number,
  validationContentVersion: number,
  repairLogs: RepairLogEntry[],
  validatedAt: Date,
): ValidationFreshnessResult {
  if (testContentVersion <= validationContentVersion) {
    return { isStale: false, repairedQuestionIds: [] };
  }

  const repairedSince = repairLogs
    .filter((log) => log.createdAt > validatedAt)
    .map((log) => log.questionId);

  const repairedQuestionIds = [...new Set(repairedSince)];

  return { isStale: true, repairedQuestionIds };
}

// ─── Per-question freshness (primary, incremental) ────────────────────────────

/**
 * Shape of a question needed for per-question staleness checks.
 */
export type QuestionVersionInfo = {
  id: string;
  questionVersion: number;
};

/**
 * Shape of a validation result needed for per-question staleness checks.
 */
export type QVRVersionInfo = {
  questionId: string;
  questionVersion: number;
};

/**
 * Compute which questions are STALE (need AI revalidation).
 *
 * A question is stale when:
 *   - No QuestionValidationResult exists for it, OR
 *   - The stored QVR.questionVersion ≠ GeneratedQuestion.questionVersion
 *
 * @param questions  All GeneratedQuestion rows (id + questionVersion)
 * @param qvrList    All QuestionValidationResult rows for the current TestValidation
 * @returns          Sorted list of stale questionIds
 */
export function computeStaleQuestions(
  questions: QuestionVersionInfo[],
  qvrList: QVRVersionInfo[],
): string[] {
  const qvrMap = new Map<string, number>(
    qvrList.map((r) => [r.questionId, r.questionVersion]),
  );

  return questions
    .filter((gq) => {
      const qvrVersion = qvrMap.get(gq.id);
      return qvrVersion === undefined || qvrVersion !== gq.questionVersion;
    })
    .map((gq) => gq.id);
}
