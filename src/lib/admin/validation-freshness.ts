/**
 * Validation freshness helpers.
 *
 * Determines whether a stored TestValidation snapshot is still current relative
 * to a GeneratedTest's latest contentVersion, and which specific questions have
 * been repaired since the snapshot was taken.
 *
 * A QuestionValidationResult produced at contentVersion N must never be shown as
 * "current" for a question at contentVersion N+1.
 *
 * This module is pure (no DB calls) so it is easy to unit-test.
 * The DB fetching is done by the caller (the API route).
 */

export type ValidationFreshnessResult = {
  /** True when GeneratedTest.contentVersion > TestValidation.contentVersion */
  isStale: boolean;
  /**
   * Deduplicated list of questionIds repaired after validatedAt.
   * Empty when isStale is false.
   */
  repairedQuestionIds: string[];
};

export type RepairLogEntry = {
  questionId: string;
  createdAt: Date;
};

/**
 * Compute whether a TestValidation snapshot is stale and which questions were
 * repaired since it was taken.
 *
 * @param testContentVersion   Current GeneratedTest.contentVersion
 * @param validationContentVersion  TestValidation.contentVersion (snapshot at validation time)
 * @param repairLogs   All QuestionRepairLog rows for this test (any time)
 * @param validatedAt  TestValidation.validatedAt date
 */
export function computeValidationFreshness(
  testContentVersion: number,
  validationContentVersion: number,
  repairLogs: RepairLogEntry[],
  validatedAt: Date,
): ValidationFreshnessResult {
  // No repair since last validation
  if (testContentVersion <= validationContentVersion) {
    return { isStale: false, repairedQuestionIds: [] };
  }

  // At least one contentVersion increment occurred after the last validation.
  // Find which questions were repaired since validatedAt.
  const repairedSince = repairLogs
    .filter((log) => log.createdAt > validatedAt)
    .map((log) => log.questionId);

  // Deduplicate (in case of multiple repair attempts on the same question)
  const repairedQuestionIds = [...new Set(repairedSince)];

  return { isStale: true, repairedQuestionIds };
}
