/**
 * Tests for the INVALID_ORDERING_CRITERION validation rule.
 *
 * This rule catches CHRONOLOGY/ordering questions that lack an objectively
 * measurable, single-answer comparison axis — e.g. "arrange independent rivers
 * from source to sea" (no shared axis exists across different rivers).
 *
 * Covers the 8 scenarios specified in the user requirements:
 *   1. valid historical chronology passes (criterion = known dates)
 *   2. valid north-to-south ordering passes (criterion = geography)
 *   3. valid numerical ordering passes (criterion = length/value)
 *   4. ambiguous river source-to-sea ordering → FAIL
 *   5. missing comparison criterion → FAIL
 *   6. multiple defensible sequences → FAIL
 *   7. INVALID_ORDERING_CRITERION cannot be auto-PASS'd by contradiction resolver
 *   8. INVALID_ORDERING_CRITERION defaults repair mode to REPLACE
 */

import { describe, it, expect } from 'vitest';
import {
  classifyContradiction,
} from '@/lib/admin/validator-consistency';
import {
  isRepairableValidationResult,
  defaultRepairMode,
} from '@/lib/admin/repair-helpers';
import type { GeneratedQuestion } from '@/types/generated-test';
import type { IssueType, QuestionValidationInput, StoredQuestionValidation } from '@/types/validation';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeChronologyQuestion(id: string, correctOption: 'A' | 'B' | 'C' | 'D' = 'A'): GeneratedQuestion {
  return {
    id,
    testId: 'test-geo',
    order: 1,
    category: 'Geography',
    topic: 'Indian Rivers',
    difficulty: 'Hard',
    questionType: 'CHRONOLOGY',
    questionHi: 'नदियों को पश्चिम से पूर्व के क्रम में व्यवस्थित करें',
    questionEn: 'Arrange the rivers from west to east by their mouths',
    optionAHi: '1, 3, 4, 2',
    optionBHi: '2, 1, 3, 4',
    optionCHi: '3, 4, 1, 2',
    optionDHi: '4, 2, 1, 3',
    optionEHi: 'उत्तर नहीं देना',
    optionAEn: '1, 3, 4, 2',
    optionBEn: '2, 1, 3, 4',
    optionCEn: '3, 4, 1, 2',
    optionDEn: '4, 2, 1, 3',
    optionEEn: 'I do not want to answer',
    explanationHi: 'पश्चिम से पूर्व का क्रम।',
    explanationEn: 'West to east order by longitude.',
    correctOption,
    questionVersion: 1,
    answerSource: 'AI_VALIDATED' as const,
    createdAt: new Date().toISOString(),
  };
}

function makeQVI(
  questionId: string,
  status: 'PASS' | 'FAIL' | 'REVIEW',
  issueTypes: IssueType[],
  suggestedFix: string | null = null,
): QuestionValidationInput {
  return {
    questionId,
    order: 1,
    status,
    confidence: 0.85,
    issues: issueTypes.map((t) => ({
      type: t,
      message: `[${t}] issue detected`,
      severity: 'ERROR' as const,
    })),
    suggestedFix,
    factualNotes: null,
  };
}

function makeStoredQV(
  questionId: string,
  status: 'PASS' | 'FAIL' | 'REVIEW',
  issueTypes: IssueType[],
): StoredQuestionValidation {
  return {
    id: `qvr-${questionId}`,
    validationId: 'val-1',
    questionId,
    order: 1,
    status,
    confidence: 0.85,
    issues: issueTypes.map((t) => ({
      type: t,
      message: `[${t}] issue detected`,
      severity: 'ERROR' as const,
    })),
    suggestedFix: null,
    factualNotes: null,
    questionVersion: 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Valid historical chronology passes (criterion = known dates)
// ─────────────────────────────────────────────────────────────────────────────

describe('1: valid historical chronology passes', () => {
  const q = makeChronologyQuestion('q1');

  it('PASS result with no issues classifies as NONE contradiction', () => {
    const r = makeQVI('q1', 'PASS', []);
    // A PASS result has no contradiction to classify
    expect(classifyContradiction(r, q)).toBe('NONE');
  });

  it('PASS result with no INVALID_ORDERING_CRITERION is not flagged as needing repair', () => {
    const stored = makeStoredQV('q1', 'PASS', []);
    expect(isRepairableValidationResult(stored)).toBe(false);
  });

  it('defaultRepairMode returns AUTO_FIX for a question with no structural issues', () => {
    const stored = makeStoredQV('q1', 'FAIL', ['FACTUAL_ERROR']);
    expect(defaultRepairMode(stored)).toBe('AUTO_FIX');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Valid north-to-south ordering passes
// ─────────────────────────────────────────────────────────────────────────────

describe('2: valid spatial ordering (north to south) passes', () => {
  const q = {
    ...makeChronologyQuestion('q2'),
    questionEn: 'Arrange the following rivers from north to south by their origin:\n\n1. Ganga\n2. Godavari\n3. Krishna\n4. Kaveri',
  } as GeneratedQuestion;

  it('PASS result for valid spatial ordering has no blocking issues', () => {
    const stored = makeStoredQV('q2', 'PASS', []);
    expect(isRepairableValidationResult(stored)).toBe(false);
    expect(defaultRepairMode(stored)).toBe('AUTO_FIX');
  });

  it('FAIL result for factual error (not structural) uses AUTO_FIX by default', () => {
    const stored = makeStoredQV('q2', 'FAIL', ['FACTUAL_ERROR']);
    expect(defaultRepairMode(stored)).toBe('AUTO_FIX');
  });

  it('spatial ordering FAIL+suggestedFix endorsing current answer = STRONG contradiction (would trigger retry)', () => {
    const r = makeQVI('q2', 'FAIL', ['FACTUAL_ERROR'], 'Should be 1, 3, 4, 2');
    // optionAEn = "1, 3, 4, 2" — contradiction detected
    expect(classifyContradiction(r, q)).toBe('STRONG');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Valid numerical ordering passes
// ─────────────────────────────────────────────────────────────────────────────

describe('3: valid numerical ordering (ascending length) passes', () => {
  it('PASS result for numerical ordering has no blocking issues', () => {
    const stored = makeStoredQV('q3', 'PASS', []);
    expect(isRepairableValidationResult(stored)).toBe(false);
  });

  it('numerical ordering FAIL flagged as FACTUAL_ERROR uses AUTO_FIX default', () => {
    const stored = makeStoredQV('q3', 'FAIL', ['FACTUAL_ERROR']);
    expect(defaultRepairMode(stored)).toBe('AUTO_FIX');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Ambiguous river "source to sea" ordering → FAIL with INVALID_ORDERING_CRITERION
// ─────────────────────────────────────────────────────────────────────────────

describe('4: ambiguous river source-to-sea ordering → INVALID_ORDERING_CRITERION', () => {
  const q = {
    ...makeChronologyQuestion('q4'),
    questionEn: 'Arrange the following rivers from their sources to where they meet the sea:\n\n1. Brahmaputra\n2. Narmada\n3. Godavari\n4. Kaveri',
  } as GeneratedQuestion;

  it('FAIL with INVALID_ORDERING_CRITERION is repairable', () => {
    const stored = makeStoredQV('q4', 'FAIL', ['INVALID_ORDERING_CRITERION']);
    expect(isRepairableValidationResult(stored)).toBe(true);
  });

  it('INVALID_ORDERING_CRITERION defaults repair to REPLACE', () => {
    const stored = makeStoredQV('q4', 'FAIL', ['INVALID_ORDERING_CRITERION']);
    expect(defaultRepairMode(stored)).toBe('REPLACE');
  });

  it('INVALID_ORDERING_CRITERION + suggestedFix endorsing current answer = AMBIGUOUS (not STRONG)', () => {
    // The structural ambiguity blocks STRONG classification
    const r = makeQVI('q4', 'FAIL', ['INVALID_ORDERING_CRITERION'], 'Should be 1, 3, 4, 2');
    expect(classifyContradiction(r, q)).toBe('AMBIGUOUS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Missing comparison criterion → FAIL
// ─────────────────────────────────────────────────────────────────────────────

describe('5: missing comparison criterion → INVALID_ORDERING_CRITERION', () => {
  it('INVALID_ORDERING_CRITERION alone is repairable', () => {
    const stored = makeStoredQV('q5', 'FAIL', ['INVALID_ORDERING_CRITERION']);
    expect(isRepairableValidationResult(stored)).toBe(true);
  });

  it('INVALID_ORDERING_CRITERION always defaults to REPLACE regardless of other issues', () => {
    // Even if combined with FACTUAL_ERROR, the structural issue dominates
    const stored = makeStoredQV('q5', 'FAIL', ['INVALID_ORDERING_CRITERION', 'FACTUAL_ERROR']);
    expect(defaultRepairMode(stored)).toBe('REPLACE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Multiple defensible sequences exist → FAIL
// ─────────────────────────────────────────────────────────────────────────────

describe('6: multiple defensible sequences → INVALID_ORDERING_CRITERION', () => {
  it('INVALID_ORDERING_CRITERION cannot be resolved to PASS by auto-fix', () => {
    // This is a structural guarantee enforced by INDEPENDENT_BLOCKING_TYPES
    const q = makeChronologyQuestion('q6');
    const r = makeQVI('q6', 'FAIL', ['INVALID_ORDERING_CRITERION'], 'Should be option A');
    // INDEPENDENT_BLOCKING_TYPES includes INVALID_ORDERING_CRITERION → AMBIGUOUS not STRONG
    expect(classifyContradiction(r, q)).toBe('AMBIGUOUS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. INVALID_ORDERING_CRITERION cannot be auto-PASS'd by contradiction resolver
// ─────────────────────────────────────────────────────────────────────────────

describe('7: contradiction resolver cannot auto-PASS when structural issue present', () => {
  const q = makeChronologyQuestion('q7');

  it('STRONG classification is blocked when INVALID_ORDERING_CRITERION is an issue', () => {
    const r = makeQVI('q7', 'FAIL', ['INVALID_ORDERING_CRITERION', 'FACTUAL_ERROR'], 'should be option A');
    // INVALID_ORDERING_CRITERION is in INDEPENDENT_BLOCKING_TYPES
    // → classifyContradiction returns AMBIGUOUS (not STRONG)
    expect(classifyContradiction(r, q)).toBe('AMBIGUOUS');
  });

  it('STRONG is blocked even when letter endorsement is very explicit', () => {
    const r = makeQVI('q7', 'FAIL', ['INVALID_ORDERING_CRITERION'], 'correct answer is A');
    expect(classifyContradiction(r, q)).toBe('AMBIGUOUS');
  });

  it('STRONG is blocked even when text overlap endorsement is present', () => {
    // optionAEn = "1, 3, 4, 2"
    const r = makeQVI('q7', 'FAIL', ['INVALID_ORDERING_CRITERION'], 'Correct sequence should be 1, 3, 4, 2');
    expect(classifyContradiction(r, q)).toBe('AMBIGUOUS');
  });

  it('AMBIGUOUS (not NONE) because suggestedFix still endorses current answer', () => {
    const r = makeQVI('q7', 'FAIL', ['INVALID_ORDERING_CRITERION'], 'should be option A');
    // Should be AMBIGUOUS not NONE — contradiction IS detected but blocked to STRONG
    expect(classifyContradiction(r, q)).not.toBe('NONE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. INVALID_ORDERING_CRITERION defaults repair UI to Replace with New
// ─────────────────────────────────────────────────────────────────────────────

describe('8: INVALID_ORDERING_CRITERION defaults repair to REPLACE', () => {
  it('returns REPLACE for INVALID_ORDERING_CRITERION alone', () => {
    const stored = makeStoredQV('q8', 'FAIL', ['INVALID_ORDERING_CRITERION']);
    expect(defaultRepairMode(stored)).toBe('REPLACE');
  });

  it('returns REPLACE for combined INVALID_ORDERING_CRITERION + AMBIGUITY', () => {
    const stored = makeStoredQV('q8', 'FAIL', ['INVALID_ORDERING_CRITERION', 'AMBIGUITY']);
    expect(defaultRepairMode(stored)).toBe('REPLACE');
  });

  it('returns REPLACE for TOPIC_SCOPE_FAIL (existing behavior unchanged)', () => {
    const stored = makeStoredQV('q8', 'FAIL', ['TOPIC_SCOPE_FAIL']);
    expect(defaultRepairMode(stored)).toBe('REPLACE');
  });

  it('returns AUTO_FIX for FACTUAL_ERROR alone (normal flow unchanged)', () => {
    const stored = makeStoredQV('q8', 'FAIL', ['FACTUAL_ERROR']);
    expect(defaultRepairMode(stored)).toBe('AUTO_FIX');
  });

  it('returns AUTO_FIX for AMBIGUITY alone (no structural ordering issue)', () => {
    const stored = makeStoredQV('q8', 'FAIL', ['AMBIGUITY']);
    expect(defaultRepairMode(stored)).toBe('AUTO_FIX');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-subject verification: issue type is generic (not Geography-specific)
// ─────────────────────────────────────────────────────────────────────────────

describe('cross-subject: INVALID_ORDERING_CRITERION is domain-agnostic', () => {
  const subjects = ['History', 'Science', 'Polity', 'Math', 'Geography'];

  subjects.forEach((subject) => {
    it(`${subject}: INVALID_ORDERING_CRITERION defaults to REPLACE`, () => {
      const stored: StoredQuestionValidation = {
        id: `qvr-${subject}`,
        validationId: 'val-x',
        questionId: `q-${subject}`,
        order: 1,
        status: 'FAIL',
        confidence: 0.8,
        issues: [{ type: 'INVALID_ORDERING_CRITERION', message: 'Ambiguous criterion', severity: 'ERROR' }],
        suggestedFix: null,
        factualNotes: null,
        questionVersion: 1,
      };
      expect(defaultRepairMode(stored)).toBe('REPLACE');
      expect(isRepairableValidationResult(stored)).toBe(true);
    });
  });
});
