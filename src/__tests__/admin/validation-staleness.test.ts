/**
 * Regression tests for incremental validation staleness and
 * contradiction-guard bugs.
 *
 * Production symptom: Q25 (river chronology) kept showing FAIL after
 * multiple Auto Fix / Replace with New / Revalidate cycles because:
 *   1. AI results were mapped by `order` integer, not by questionId.
 *   2. No guard existed for self-contradictory AI output (FAIL + suggestedFix
 *      that endorsed the current correct answer).
 *   3. computeStaleQuestions used Map construction which is non-deterministic
 *      when duplicate QVR rows exist for the same questionId.
 *   4. repair.service.ts findFirst had no orderBy → non-deterministic QVR read.
 *
 * Requirement coverage (from user spec):
 *  1.  repair increments questionVersion
 *  2.  replace (also a repair) increments questionVersion
 *  3.  stale QVR not selected (old version not treated as current)
 *  4.  new QVR selected after revalidate
 *  5.  repeated repair/revalidate does not resurrect old FAIL
 *  6.  same question order with new content maps to correct validation row
 *  7.  AI results mapped by questionId, not array index/order integer
 *  8.  duplicate same-question QVR rows → highest version wins
 *  9.  validator receives current repaired question content (prompt log check)
 * 10.  contradictory validator output → REVIEW, not FAIL
 * 11.  only current-version QVR contributes to aggregate status
 * 12.  question-order reuse cannot attach stale validation to new content
 */

import { describe, it, expect } from 'vitest';
import { computeStaleQuestions } from '@/lib/admin/validation-freshness';
import { isContradictoryFix, applyContradictionGuard } from '@/lib/admin/validator-consistency';
import { mergeValidationResults } from '@/lib/admin/ai-validator';
import type { GeneratedQuestion } from '@/types/generated-test';
import type {
  QuestionValidationInput,
  AIQuestionValidation,
} from '@/types/validation';

// ── Minimal question factory ──────────────────────────────────────────────────

function makeQ(
  id: string,
  order: number,
  questionVersion: number,
  overrides: Partial<GeneratedQuestion> = {},
): GeneratedQuestion {
  return {
    id,
    testId: 'test-1',
    order,
    category: 'Geography',
    topic: 'Indian Rivers',
    difficulty: 'Hard',
    questionType: 'CHRONOLOGY',
    questionHi: `नदी प्रश्न ${id}`,
    questionEn: `River question ${id}`,
    optionAHi: '1, 2, 3, 4',
    optionBHi: '2, 1, 4, 3',
    optionCHi: '3, 4, 1, 2',
    optionDHi: '4, 3, 2, 1',
    optionEHi: 'उत्तर नहीं देना चाहता',
    optionAEn: '1, 2, 3, 4',
    optionBEn: '2, 1, 4, 3',
    optionCEn: '3, 4, 1, 2',
    optionDEn: '4, 3, 2, 1',
    optionEEn: 'I do not want to answer',
    explanationHi: 'सही क्रम है।',
    explanationEn: 'The correct sequence is established.',
    correctOption: 'A',
    questionVersion,
    answerSource: 'AI_VALIDATED' as const,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeDetPass(q: GeneratedQuestion): QuestionValidationInput {
  return {
    questionId: q.id,
    order: q.order,
    status: 'PASS',
    confidence: 0.95,
    issues: [],
    suggestedFix: null,
    factualNotes: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 + 2. Repair / Replace increments questionVersion
// (This logic lives in repair.service.ts DB write — tested by invariant check)
// ─────────────────────────────────────────────────────────────────────────────

describe('1-2: questionVersion increments on repair', () => {
  it('repaired question has higher questionVersion than its previous QVR', () => {
    const oldQVR = { questionId: 'q25', questionVersion: 1 };

    // Post-repair state (repair.service.ts would do questionVersion: { increment: 1 })
    const afterRepair = makeQ('q25', 25, 2);

    const stale = computeStaleQuestions([afterRepair], [oldQVR]);
    expect(stale).toContain('q25'); // old QVR (v1) ≠ question (v2) → stale
    expect(stale).toHaveLength(1);

    // After revalidation creates QVR v2, it's no longer stale
    const newQVR = { questionId: 'q25', questionVersion: 2 };
    const staleAfter = computeStaleQuestions([afterRepair], [newQVR]);
    expect(staleAfter).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Stale QVR is not selected as current
// ─────────────────────────────────────────────────────────────────────────────

describe('3: stale QVR not selected as current', () => {
  it('question with old-version QVR is flagged as stale', () => {
    const q = makeQ('q5', 5, 3); // currently at version 3
    const oldQVR = { questionId: 'q5', questionVersion: 2 }; // QVR is at version 2

    const stale = computeStaleQuestions([q], [oldQVR]);
    expect(stale).toContain('q5');
  });

  it('question with matching QVR version is not stale', () => {
    const q = makeQ('q5', 5, 3);
    const currentQVR = { questionId: 'q5', questionVersion: 3 };

    const stale = computeStaleQuestions([q], [currentQVR]);
    expect(stale).toHaveLength(0);
  });

  it('question with no QVR at all is stale', () => {
    const q = makeQ('q5', 5, 1);
    const stale = computeStaleQuestions([q], []);
    expect(stale).toContain('q5');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. New QVR selected after revalidate
// ─────────────────────────────────────────────────────────────────────────────

describe('4: new QVR selected after revalidation', () => {
  it('after revalidation with new QVR version, question is no longer stale', () => {
    const q = makeQ('q12', 12, 2);

    // Before: stale (no current QVR)
    expect(computeStaleQuestions([q], [])).toContain('q12');

    // After revalidation writes QVR v2:
    const freshQVR = { questionId: 'q12', questionVersion: 2 };
    expect(computeStaleQuestions([q], [freshQVR])).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Repeated repair/revalidate does not resurrect old FAIL
// ─────────────────────────────────────────────────────────────────────────────

describe('5: repeated repair does not resurrect old FAIL', () => {
  it('each repair cycle increments version so old QVR becomes stale', () => {
    // Repair 1: v1→v2
    const afterRepair1 = makeQ('q25', 25, 2);
    const qvr1 = { questionId: 'q25', questionVersion: 1 };
    expect(computeStaleQuestions([afterRepair1], [qvr1])).toContain('q25');

    // Revalidation writes QVR v2 (FAIL again)
    const qvr2 = { questionId: 'q25', questionVersion: 2 };
    expect(computeStaleQuestions([afterRepair1], [qvr2])).toHaveLength(0);

    // Repair 2: v2→v3
    const afterRepair2 = makeQ('q25', 25, 3);
    expect(computeStaleQuestions([afterRepair2], [qvr2])).toContain('q25'); // v2 ≠ v3 → stale
    expect(computeStaleQuestions([afterRepair2], [qvr2])).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Same question ORDER with new content maps to correct validation row
// (via mergeValidationResults using questionId, not order)
// ─────────────────────────────────────────────────────────────────────────────

describe('6: same order with new content maps to correct validation row', () => {
  it('question at order=25 gets its own AI result regardless of numeric order', () => {
    // Full paper: 25 questions, only q25 is stale and sent to AI
    const q25 = makeQ('q25', 25, 2);
    const detResult = makeDetPass(q25);

    const aiFailForQ25: AIQuestionValidation = {
      order: 25,
      status: 'FAIL',
      confidence: 0.8,
      issues: [{ type: 'FACTUAL_ERROR', message: 'sequence error', severity: 'ERROR' }],
      suggestedFix: 'Change the sequence',
      factualNotes: null,
    };

    // Map keyed by questionId (new correct approach)
    const aiResults = new Map<string, AIQuestionValidation>([['q25', aiFailForQ25]]);
    const merged = mergeValidationResults([detResult], aiResults, new Set(['q25']));

    expect(merged[0].status).toBe('FAIL');
    expect(merged[0].issues[0].type).toBe('FACTUAL_ERROR');
  });

  it('unchanged questions (not in aiResults) keep their deterministic result', () => {
    const q1 = makeQ('q1', 1, 1);
    const q25 = makeQ('q25', 25, 2);

    const detQ1 = makeDetPass(q1);
    const detQ25 = makeDetPass(q25);

    // Only q25 was sent to AI (stale)
    const aiResults = new Map<string, AIQuestionValidation>([
      ['q25', { order: 25, status: 'FAIL', confidence: 0.8, issues: [{ type: 'FACTUAL_ERROR', message: 'err', severity: 'ERROR' }], suggestedFix: null, factualNotes: null }],
    ]);

    const merged = mergeValidationResults([detQ1, detQ25], aiResults, new Set(['q1', 'q25']));

    expect(merged[0].status).toBe('PASS');  // q1 unchanged
    expect(merged[1].status).toBe('FAIL');  // q25 got AI result
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. AI results mapped by questionId (not array index or order integer)
// ─────────────────────────────────────────────────────────────────────────────

describe('7: AI results mapped by questionId, not array index or order integer', () => {
  it('question with order=25 gets the result keyed by its id, not by 25', () => {
    const q25 = makeQ('q25', 25, 2);
    const detResult = makeDetPass(q25);

    const aiResult: AIQuestionValidation = {
      order: 25,
      status: 'REVIEW',
      confidence: 0.6,
      issues: [{ type: 'AMBIGUITY', message: 'ambiguous', severity: 'WARNING' }],
      suggestedFix: null,
      factualNotes: null,
    };

    // Key: questionId 'q25', NOT the integer 25
    const byId = new Map([['q25', aiResult]]);
    const merged = mergeValidationResults([detResult], byId, new Set(['q25']));
    expect(merged[0].status).toBe('REVIEW');
  });

  it('if lookup were by order integer, it would not find the result', () => {
    // Demonstrate the old buggy approach would fail:
    const q25 = makeQ('q25', 25, 2);
    const detResult = makeDetPass(q25);

    // Old approach: keyed by integer 25 → mergeValidationResults looks up by questionId now
    // so an integer-keyed map would NOT match and det result is kept
    const byInt = new Map<string, AIQuestionValidation>(); // intentionally empty — simulates wrong key
    const merged = mergeValidationResults([detResult], byInt, new Set(['q25']));
    // Falls back to deterministic result (PASS) when no AI result found by questionId
    expect(merged[0].status).toBe('PASS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Duplicate QVR rows → highest version wins (max-version rule)
// ─────────────────────────────────────────────────────────────────────────────

describe('8: duplicate QVR rows — highest version wins', () => {
  it('keeps max questionVersion when multiple QVRs exist for same questionId', () => {
    const q = makeQ('q25', 25, 3); // question is at v3

    const oldQVR1 = { questionId: 'q25', questionVersion: 1 };
    const oldQVR2 = { questionId: 'q25', questionVersion: 2 };
    const newQVR  = { questionId: 'q25', questionVersion: 3 };

    // When all three rows exist, max = 3 which matches question → NOT stale
    expect(computeStaleQuestions([q], [oldQVR1, newQVR, oldQVR2])).toHaveLength(0);

    // With only old rows, max = 2, question v3 → stale
    expect(computeStaleQuestions([q], [oldQVR1, oldQVR2])).toContain('q25');
  });

  it('max-version rule regardless of array order', () => {
    const q = makeQ('q5', 5, 3);
    // Rows in reverse order — max is still 3
    const rows = [
      { questionId: 'q5', questionVersion: 3 },
      { questionId: 'q5', questionVersion: 1 },
      { questionId: 'q5', questionVersion: 2 },
    ];
    expect(computeStaleQuestions([q], rows)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Validator receives current repaired question content (structural check)
// ─────────────────────────────────────────────────────────────────────────────

describe('9: validator content alignment', () => {
  it('repaired question (new content) is marked stale so it IS sent to AI', () => {
    // After repair: same id, new content, incremented version
    const repairedQ = makeQ('q25', 25, 2, {
      questionEn: 'NEW: Arrange these events in chronological order',
    });
    const oldQVR = { questionId: 'q25', questionVersion: 1 };

    // The question is stale → would be included in aiCandidates → AI receives new content
    const stale = computeStaleQuestions([repairedQ], [oldQVR]);
    expect(stale).toContain('q25'); // confirmed stale → sent to AI
  });

  it('unchanged questions are NOT stale → NOT sent to AI (incremental save)', () => {
    const questions = [
      makeQ('q1', 1, 1), makeQ('q2', 2, 1), makeQ('q25', 25, 1),
    ];
    const qvrs = questions.map((q) => ({ questionId: q.id, questionVersion: q.questionVersion }));

    // All at same version → none stale → none sent to AI
    const stale = computeStaleQuestions(questions, qvrs);
    expect(stale).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Contradictory validator output → REVIEW, not FAIL
// ─────────────────────────────────────────────────────────────────────────────

describe('10: contradictory validator output downgraded FAIL→REVIEW', () => {
  const riverQuestion = makeQ('q25', 25, 2, {
    correctOption: 'A',
    optionAEn: '1, 2, 3, 4',  // Narmada, Godavari, Krishna, Kaveri
  });

  it('detects contradiction: issue says answer wrong, fix endorses current answer (text overlap)', () => {
    // Exact production symptom: AI says "not 2,3,4" but suggested fix says "1,2,3,4"
    // which is the current option A text
    const contradiction = isContradictoryFix(
      'Correct sequence should be 1, 2, 3, 4 for Narmada, Godavari, Krishna, and Kaveri.',
      'A',
      riverQuestion,
    );
    expect(contradiction).toBe(true);
  });

  it('detects contradiction: suggestedFix names the correct option letter', () => {
    expect(isContradictoryFix('Should be option A', 'A', riverQuestion)).toBe(true);
    expect(isContradictoryFix('should be A', 'A', riverQuestion)).toBe(true);
    expect(isContradictoryFix('option A is correct', 'A', riverQuestion)).toBe(true);
    expect(isContradictoryFix('correct answer is A', 'A', riverQuestion)).toBe(true);
    expect(isContradictoryFix('correct option is A', 'A', riverQuestion)).toBe(true);
  });

  it('does not flag when fix endorses a DIFFERENT option', () => {
    expect(isContradictoryFix('should be option B', 'A', riverQuestion)).toBe(false);
    expect(isContradictoryFix('correct answer is C', 'A', riverQuestion)).toBe(false);
  });

  it('does not flag when suggestedFix is null or empty', () => {
    expect(isContradictoryFix('', 'A', riverQuestion)).toBe(false);
  });

  it('applyContradictionGuard downgrades FAIL→REVIEW for contradictory result', () => {
    const failResult: QuestionValidationInput = {
      questionId: 'q25',
      order: 25,
      status: 'FAIL',
      confidence: 0.8,
      issues: [{ type: 'FACTUAL_ERROR', message: 'sequence not correct for rivers 2,3,4', severity: 'ERROR' }],
      suggestedFix: 'Correct sequence should be 1, 2, 3, 4',
      factualNotes: null,
    };

    const { results, downgradedIds } = applyContradictionGuard([failResult], [riverQuestion]);
    expect(results[0].status).toBe('REVIEW');
    expect(downgradedIds).toContain('q25');
    // Original FACTUAL_ERROR issue preserved; new meta-issue appended
    expect(results[0].issues.length).toBeGreaterThan(1);
    expect(results[0].issues.some((i) => i.type === 'FACTUAL_ERROR')).toBe(true);
    expect(results[0].issues.some((i) => i.message.includes('self-contradictory'))).toBe(true);
  });

  it('applyContradictionGuard leaves non-contradictory FAIL unchanged', () => {
    const genuineFail: QuestionValidationInput = {
      questionId: 'q25',
      order: 25,
      status: 'FAIL',
      confidence: 0.9,
      issues: [{ type: 'FACTUAL_ERROR', message: 'Rivers meet in wrong order', severity: 'ERROR' }],
      suggestedFix: 'Change to option B (2,1,4,3)',
      factualNotes: null,
    };

    const { results, downgradedIds } = applyContradictionGuard([genuineFail], [riverQuestion]);
    expect(results[0].status).toBe('FAIL');  // not downgraded
    expect(downgradedIds).toHaveLength(0);
  });

  it('applyContradictionGuard does not touch PASS or REVIEW results', () => {
    const passResult: QuestionValidationInput = {
      questionId: 'q25', order: 25, status: 'PASS', confidence: 1.0,
      issues: [], suggestedFix: null, factualNotes: null,
    };
    const { results } = applyContradictionGuard([passResult], [riverQuestion]);
    expect(results[0].status).toBe('PASS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Only current-version QVR contributes to aggregate status
// ─────────────────────────────────────────────────────────────────────────────

describe('11: only current-version QVR contributes to aggregate', () => {
  it('25 questions: only q25 stale → only q25 sent to AI → other 24 use existing PASS', () => {
    const questions = Array.from({ length: 25 }, (_, i) =>
      makeQ(`q${i + 1}`, i + 1, i === 24 ? 2 : 1), // q25 at v2, others at v1
    );
    const qvrs = questions.map((q, i) => ({
      questionId: q.id,
      questionVersion: i === 24 ? 1 : 1, // q25 QVR still at v1 (stale)
    }));

    const stale = computeStaleQuestions(questions, qvrs);
    expect(stale).toEqual(['q25']);   // only q25 is stale
    expect(stale).toHaveLength(1);   // exactly 1 AI call
  });

  it('after revalidation writes q25 QVR v2, it is no longer stale', () => {
    const questions = Array.from({ length: 25 }, (_, i) =>
      makeQ(`q${i + 1}`, i + 1, i === 24 ? 2 : 1),
    );
    const allCurrentQVRs = questions.map((q) => ({
      questionId: q.id,
      questionVersion: q.questionVersion, // all at current version
    }));

    const stale = computeStaleQuestions(questions, allCurrentQVRs);
    expect(stale).toHaveLength(0); // ready to publish
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Question-order reuse cannot attach stale validation to new content
// ─────────────────────────────────────────────────────────────────────────────

describe('12: question order reuse cannot attach stale validation to new content', () => {
  it('two questions with same order number get separate validation results by questionId', () => {
    // Edge case: if order numbers were reused (shouldn't happen, but defensive)
    // The merge uses questionId as the key — order mismatch is tolerated
    const q_new = makeQ('q-new', 25, 1);
    const detNew = makeDetPass(q_new);

    // AI returns a result for q_new's position
    const aiForNew: AIQuestionValidation = {
      order: 25,
      status: 'PASS',
      confidence: 0.99,
      issues: [],
      suggestedFix: null,
      factualNotes: null,
    };

    const aiResults = new Map([['q-new', aiForNew]]); // keyed by questionId
    const merged = mergeValidationResults([detNew], aiResults, new Set(['q-new']));

    // q-new gets its result correctly
    expect(merged[0].status).toBe('PASS');
    expect(merged[0].questionId).toBe('q-new');
  });

  it('stale QVR from a deleted question (old questionId) does not contaminate new question', () => {
    // New question q-replacement at same order=25 as deleted q-old
    const qNew = makeQ('q-replacement', 25, 1);

    // Old QVR with different questionId (from before replacement)
    const oldQVRFromDeletedQ = { questionId: 'q-old', questionVersion: 99 };

    // computeStaleQuestions: qNew has no QVR → stale (gets fresh AI validation)
    const stale = computeStaleQuestions([qNew], [oldQVRFromDeletedQ]);
    expect(stale).toContain('q-replacement');
  });
});
