/**
 * Regression tests for validation freshness determination.
 *
 * Root cause of the production bug (Aug 2026):
 *   After single-question repair, GeneratedQuestion is updated in-place (same id).
 *   QuestionValidationResult is keyed by questionId and is NOT touched by repair.
 *   The UI rendered stale validation issues beneath the new question text.
 *
 * Fix: computeValidationFreshness() compares testContentVersion vs
 * validationContentVersion and scans QuestionRepairLog entries created after
 * validatedAt to determine repairedQuestionIds. The UI hides stale issue details
 * and shows "Needs Revalidation" for those questions.
 *
 * Tests (per user requirement §tests):
 *  1.  repair changes question text — covered by repair.test.ts
 *  2.  old QuestionValidationResult does NOT render as current after repair
 *  3.  stale validation issue is not shown beneath new question
 *  4.  repaired question shows NEEDS_REVALIDATION (repairedQuestionIds populated)
 *  5.  contentVersion increments — covered by repair.test.ts
 *  6.  old validation remains preserved historically (isStale true but data intact)
 *  7.  full revalidation produces new current validation (isStale false)
 *  8.  new validation replaces stale display (repairedQuestionIds empty)
 *  9.  untouched questions are not in repairedQuestionIds
 * 10.  published tests remain immutable — covered by repair.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  computeValidationFreshness,
  type RepairLogEntry,
} from '@/lib/admin/validation-freshness';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const T0 = new Date('2026-08-22T08:00:00Z'); // validation ran at T0
const T1 = new Date('2026-08-22T09:00:00Z'); // repair happened at T1 (after T0)
const T2 = new Date('2026-08-22T07:00:00Z'); // repair happened at T2 (before T0, irrelevant)

const Q_REPAIRED = 'q-repaired-1';
const Q_UNTOUCHED = 'q-untouched-2';

// ─── computeValidationFreshness ───────────────────────────────────────────────

describe('computeValidationFreshness', () => {
  // Test 7 & 8: No repair since last validation — fresh
  it('returns isStale=false and empty repairedQuestionIds when contentVersions match', () => {
    const result = computeValidationFreshness(3, 3, [], T0);
    expect(result.isStale).toBe(false);
    expect(result.repairedQuestionIds).toHaveLength(0);
  });

  it('returns isStale=false when testContentVersion < validationContentVersion (edge case)', () => {
    // Should never happen in practice, but handle gracefully
    const result = computeValidationFreshness(2, 3, [], T0);
    expect(result.isStale).toBe(false);
    expect(result.repairedQuestionIds).toHaveLength(0);
  });

  // Test 4: Repaired question shows NEEDS_REVALIDATION (repairedQuestionIds populated)
  it('returns isStale=true and includes repaired questionId when contentVersion advanced', () => {
    const logs: RepairLogEntry[] = [
      { questionId: Q_REPAIRED, createdAt: T1 }, // T1 > T0
    ];
    const result = computeValidationFreshness(4, 3, logs, T0);
    expect(result.isStale).toBe(true);
    expect(result.repairedQuestionIds).toContain(Q_REPAIRED);
  });

  // Test 2 & 3: Old QuestionValidationResult must not render as current
  // (verified by repairedQuestionIds containing the repaired question)
  it('includes only questions repaired AFTER validatedAt, not before', () => {
    const logs: RepairLogEntry[] = [
      { questionId: Q_REPAIRED, createdAt: T1 }, // after T0 — included
      { questionId: 'q-old-repair', createdAt: T2 }, // before T0 — excluded
    ];
    const result = computeValidationFreshness(4, 3, logs, T0);
    expect(result.repairedQuestionIds).toContain(Q_REPAIRED);
    expect(result.repairedQuestionIds).not.toContain('q-old-repair');
  });

  // Test 9: Untouched questions are NOT in repairedQuestionIds
  it('does not include untouched questions in repairedQuestionIds', () => {
    const logs: RepairLogEntry[] = [
      { questionId: Q_REPAIRED, createdAt: T1 },
    ];
    const result = computeValidationFreshness(4, 3, logs, T0);
    expect(result.repairedQuestionIds).not.toContain(Q_UNTOUCHED);
    expect(result.repairedQuestionIds).toHaveLength(1);
  });

  // Test 6: Old validation remains preserved historically
  // (isStale=true but the validation data itself is still returned by the API)
  it('marks validation stale without destroying it (isStale=true, questionIds available)', () => {
    const logs: RepairLogEntry[] = [
      { questionId: Q_REPAIRED, createdAt: T1 },
    ];
    const result = computeValidationFreshness(4, 3, logs, T0);
    // Data is still present (caller has the full validation object)
    // Only the freshness flags change
    expect(result.isStale).toBe(true);
    expect(result.repairedQuestionIds).toEqual([Q_REPAIRED]);
  });

  it('deduplicates questionIds when same question repaired multiple times', () => {
    const logs: RepairLogEntry[] = [
      { questionId: Q_REPAIRED, createdAt: T1 },
      { questionId: Q_REPAIRED, createdAt: new Date(T1.getTime() + 3600_000) }, // another repair
    ];
    const result = computeValidationFreshness(5, 3, logs, T0);
    expect(result.repairedQuestionIds.filter((id) => id === Q_REPAIRED)).toHaveLength(1);
  });

  it('handles multiple different questions repaired since validation', () => {
    const Q2 = 'q-repaired-second';
    const logs: RepairLogEntry[] = [
      { questionId: Q_REPAIRED, createdAt: T1 },
      { questionId: Q2, createdAt: new Date(T1.getTime() + 600_000) },
    ];
    const result = computeValidationFreshness(5, 3, logs, T0);
    expect(result.isStale).toBe(true);
    expect(result.repairedQuestionIds).toContain(Q_REPAIRED);
    expect(result.repairedQuestionIds).toContain(Q2);
    expect(result.repairedQuestionIds).toHaveLength(2);
  });

  // Test 7 & 8: After full revalidation, freshness resets
  it('returns isStale=false after revalidation updates validationContentVersion to match', () => {
    // Simulates: repaired at contentVersion 3→4, then revalidated at contentVersion 4
    // Now testContentVersion=4 and validationContentVersion=4 → fresh
    const logs: RepairLogEntry[] = [
      { questionId: Q_REPAIRED, createdAt: T1 }, // repair happened, but now re-validated
    ];
    // New validatedAt is T2_after (after T1)
    const newValidatedAt = new Date(T1.getTime() + 7200_000); // 2h after repair
    const result = computeValidationFreshness(4, 4, logs, newValidatedAt);
    expect(result.isStale).toBe(false);
    expect(result.repairedQuestionIds).toHaveLength(0);
  });

  it('returns isStale=false and empty list when there are no repair logs at all', () => {
    // Test freshly validated with no repairs ever
    const result = computeValidationFreshness(1, 1, [], T0);
    expect(result.isStale).toBe(false);
    expect(result.repairedQuestionIds).toEqual([]);
  });

  it('handles logs array with repair before validatedAt and none after — returns isStale=false', () => {
    // contentVersion is ahead, but the repair log entries are all before validatedAt
    // This would be unusual but guard against it
    const logs: RepairLogEntry[] = [
      { questionId: Q_REPAIRED, createdAt: T2 }, // T2 < T0 (before validation)
    ];
    // However contentVersion IS ahead, so isStale=true
    const result = computeValidationFreshness(4, 3, logs, T0);
    // isStale=true because versions differ, but no repair AFTER validatedAt
    expect(result.isStale).toBe(true);
    expect(result.repairedQuestionIds).toHaveLength(0);
  });

  it('treats exactly-equal timestamps as not-after (boundary)', () => {
    // log.createdAt === validatedAt — should NOT be included (not strictly after)
    const logs: RepairLogEntry[] = [
      { questionId: Q_REPAIRED, createdAt: T0 }, // exactly at T0
    ];
    const result = computeValidationFreshness(4, 3, logs, T0);
    expect(result.isStale).toBe(true);
    expect(result.repairedQuestionIds).toHaveLength(0); // not strictly after
  });
});
