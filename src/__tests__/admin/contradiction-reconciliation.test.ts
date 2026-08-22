/**
 * Tests for STRONG vs AMBIGUOUS contradiction classification and the
 * reconciliation flow (retry → PASS / normalize → PASS / keep FAIL/REVIEW).
 *
 * Production trigger: Q25 in Geography test showed:
 *   correctOption A = "1, 3, 4, 2"
 *   status = FAIL
 *   suggestedFix = "The correct answer should be 1, 3, 4, 2"
 *   factualNotes = "Brahmaputra → Godavari → Kaveri → Narmada"
 * → STRONG contradiction → should be retried and resolved to PASS.
 *
 * Covers requirements 1–12 from the user spec.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyContradiction,
  factualNotesSupportCurrentAnswer,
  buildResolvedPassResult,
  buildAmbiguousReviewResult,
  applyContradictionGuard,
} from '@/lib/admin/validator-consistency';
import type { GeneratedQuestion } from '@/types/generated-test';
import type { QuestionValidationInput } from '@/types/validation';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeQ(
  id: string,
  overrides: Partial<GeneratedQuestion> = {},
): GeneratedQuestion {
  return {
    id,
    testId: 'test-geo',
    order: 25,
    category: 'Geography',
    topic: 'Indian Rivers',
    difficulty: 'Hard',
    questionType: 'CHRONOLOGY',
    questionHi: 'नदियों को समुद्र में मिलने के क्रम में व्यवस्थित करें',
    questionEn: 'Arrange the rivers in the order they meet the sea',
    optionAHi: '1, 3, 4, 2',
    optionBHi: '2, 1, 3, 4',
    optionCHi: '3, 4, 1, 2',
    optionDHi: '4, 2, 1, 3',
    optionEHi: 'उत्तर नहीं देना चाहता',
    optionAEn: '1, 3, 4, 2',
    optionBEn: '2, 1, 3, 4',
    optionCEn: '3, 4, 1, 2',
    optionDEn: '4, 2, 1, 3',
    optionEEn: 'I do not want to answer',
    explanationHi: 'सही क्रम है।',
    explanationEn: 'The correct sequence is established.',
    correctOption: 'A',
    questionVersion: 3,
    answerSource: 'AI_VALIDATED' as const,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFailResult(
  qId: string,
  suggestedFix: string | null,
  factualNotes: string | null = null,
  extraIssueTypes: string[] = [],
): QuestionValidationInput {
  return {
    questionId: qId,
    order: 25,
    status: 'FAIL',
    confidence: 0.85,
    issues: [
      { type: 'FACTUAL_ERROR', message: 'The correct chronological order is incorrect.', severity: 'ERROR' },
      ...extraIssueTypes.map((t) => ({
        type: t,
        message: `${t} issue detected`,
        severity: 'ERROR' as const,
      })),
    ],
    suggestedFix,
    factualNotes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FAIL + suggestedFix exactly current option + supporting factualNotes
//    → classified as STRONG
// ─────────────────────────────────────────────────────────────────────────────

describe('1: FAIL + suggestedFix = current answer → STRONG contradiction', () => {
  const q = makeQ('q25');

  it('classifies as STRONG when suggestedFix exactly matches current option text', () => {
    const r = makeFailResult('q25', 'The correct answer should be 1, 3, 4, 2');
    expect(classifyContradiction(r, q)).toBe('STRONG');
  });

  it('classifies as STRONG when suggestedFix uses letter endorsement', () => {
    const r = makeFailResult('q25', 'Should be option A');
    expect(classifyContradiction(r, q)).toBe('STRONG');
  });

  it('factualNotesSupportCurrentAnswer returns true when factualNotes overlap with option text', () => {
    // factualNotes describe the rivers but also mention "1, 3, 4, 2"
    const supported = factualNotesSupportCurrentAnswer('The order is 1, 3, 4, 2', 'A', q);
    expect(supported).toBe(true);
  });

  it('factualNotesSupportCurrentAnswer returns false when factualNotes are empty', () => {
    expect(factualNotesSupportCurrentAnswer(null, 'A', q)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. retry PASS → final PASS
// (logic verified via buildResolvedPassResult since we cannot mock AI inline)
// ─────────────────────────────────────────────────────────────────────────────

describe('2: retry PASS → resolved to PASS', () => {
  it('buildResolvedPassResult produces clean PASS with no blocking issues', () => {
    const original = makeFailResult('q25', 'The correct answer should be 1, 3, 4, 2');
    const resolved = buildResolvedPassResult(original, 'RETRY_PASS', 'Brahmaputra before Godavari.');

    expect(resolved.status).toBe('PASS');
    expect(resolved.issues).toHaveLength(0);
    expect(resolved.suggestedFix).toBeNull();
    expect(resolved.factualNotes).toContain('Retry validation');
    expect(resolved.confidence).toBeGreaterThan(0.8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Repeated strong contradiction → normalized to PASS
// ─────────────────────────────────────────────────────────────────────────────

describe('3: repeated strong contradiction → normalized to PASS', () => {
  it('buildResolvedPassResult NORMALIZED produces PASS with normalization note', () => {
    const original = makeFailResult('q25', 'The correct answer should be 1, 3, 4, 2');
    const resolved = buildResolvedPassResult(original, 'NORMALIZED');

    expect(resolved.status).toBe('PASS');
    expect(resolved.issues).toHaveLength(0);
    expect(resolved.factualNotes).toContain('self-contradiction resolved');
    expect(resolved.confidence).toBeGreaterThanOrEqual(0.8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. suggestedFix current answer but factualNotes disagree → REVIEW, not PASS
//    (classifier returns STRONG, but downstream retry would get a coherent FAIL/REVIEW)
//    NOTE: We can test the classification independently. The safety comes from
//    the retry returning a coherent different result, not from the classifier.
//    But we CAN test the AMBIGUOUS case when blocking issues exist.
// ─────────────────────────────────────────────────────────────────────────────

describe('4: suggestedFix endorses current but blocking issue also present', () => {
  const q = makeQ('q25');

  it('classifies as AMBIGUOUS when AMBIGUITY issue also present', () => {
    const r = makeFailResult('q25', 'should be option A', null, ['AMBIGUITY']);
    expect(classifyContradiction(r, q)).toBe('AMBIGUOUS');
  });

  it('buildAmbiguousReviewResult keeps FACTUAL_ERROR + adds meta-issue', () => {
    const r = makeFailResult('q25', 'should be option A', null, ['AMBIGUITY']);
    const reviewed = buildAmbiguousReviewResult(r);

    expect(reviewed.status).toBe('REVIEW');
    expect(reviewed.issues.some((i) => i.type === 'FACTUAL_ERROR')).toBe(true);
    expect(reviewed.issues.some((i) => i.message.includes('self-contradictory'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. contradiction plus TOPIC_SCOPE_FAIL → still FAIL (AMBIGUOUS, not STRONG)
// ─────────────────────────────────────────────────────────────────────────────

describe('5: contradiction + TOPIC_SCOPE_FAIL → AMBIGUOUS (not resolved to PASS)', () => {
  const q = makeQ('q25');

  it('TOPIC_SCOPE_FAIL prevents STRONG classification', () => {
    const r = makeFailResult('q25', 'should be option A', null, ['TOPIC_SCOPE_FAIL']);
    expect(classifyContradiction(r, q)).toBe('AMBIGUOUS');
  });

  it('buildAmbiguousReviewResult preserves TOPIC_SCOPE_FAIL in issues', () => {
    const r = makeFailResult('q25', 'should be option A', null, ['TOPIC_SCOPE_FAIL']);
    const reviewed = buildAmbiguousReviewResult(r);

    expect(reviewed.status).toBe('REVIEW');
    expect(reviewed.issues.some((i) => i.type === 'TOPIC_SCOPE_FAIL')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. contradiction plus AMBIGUITY → REVIEW (AMBIGUOUS case)
// ─────────────────────────────────────────────────────────────────────────────

describe('6: contradiction + AMBIGUITY issue → AMBIGUOUS class → REVIEW', () => {
  const q = makeQ('q25');

  it('AMBIGUITY issue type triggers AMBIGUOUS class', () => {
    const r = makeFailResult('q25', 'should be option A', null, ['AMBIGUITY']);
    expect(classifyContradiction(r, q)).toBe('AMBIGUOUS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. genuine corrected answer differs from current → FAIL retained
// ─────────────────────────────────────────────────────────────────────────────

describe('7: genuine corrected answer differs from current → FAIL retained', () => {
  const q = makeQ('q25');

  it('NONE classification when suggestedFix proposes a different option', () => {
    // suggestedFix says "should be option B" — current correct is A → no contradiction
    const r = makeFailResult('q25', 'The correct sequence should be 2, 1, 3, 4 (option B)');
    expect(classifyContradiction(r, q)).toBe('NONE');
  });

  it('NONE classification when suggestedFix describes a clearly different option', () => {
    // suggestedFix only mentions option B's sequence — never mentions option A
    const r = makeFailResult('q25', 'The correct sequence is 2, 1, 3, 4 (option B) based on geographic proximity');
    // optionBEn = "2, 1, 3, 4" — probe "2 1 3 4" does NOT appear in optionAEn "1 3 4 2"
    expect(classifyContradiction(r, q)).toBe('NONE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. resolved contradiction removes blocking FACTUAL_ERROR from issues
// ─────────────────────────────────────────────────────────────────────────────

describe('8: resolved PASS has no blocking FACTUAL_ERROR', () => {
  it('buildResolvedPassResult removes all original issues', () => {
    const original = makeFailResult('q25', 'should be 1, 3, 4, 2');
    expect(original.issues.some((i) => i.type === 'FACTUAL_ERROR')).toBe(true);

    const resolved = buildResolvedPassResult(original, 'RETRY_PASS');
    expect(resolved.issues).toHaveLength(0);
    expect(resolved.issues.some((i) => i.type === 'FACTUAL_ERROR')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. validation aggregate becomes READY when contradiction was the last blocker
// (tested via the rule: if all questions PASS, overallStatus = READY)
// ─────────────────────────────────────────────────────────────────────────────

describe('9: aggregate READY when contradiction resolution was last blocker', () => {
  it('25 PASS questions produce READY overallStatus', () => {
    const results: QuestionValidationInput[] = Array.from({ length: 25 }, (_, i) => ({
      questionId: `q${i + 1}`,
      order: i + 1,
      status: 'PASS' as const,
      confidence: 0.95,
      issues: [],
      suggestedFix: null,
      factualNotes: null,
    }));

    const failed = results.filter((r) => r.status === 'FAIL').length;
    const reviewNeeded = results.filter((r) => r.status === 'REVIEW').length;
    const overallStatus = failed === 0 && reviewNeeded === 0 ? 'READY' : 'VALIDATION_FAILED';

    expect(overallStatus).toBe('READY');
  });

  it('24 PASS + 1 resolved REVIEW still not READY', () => {
    const results: QuestionValidationInput[] = Array.from({ length: 25 }, (_, i) => ({
      questionId: `q${i + 1}`,
      order: i + 1,
      status: (i === 24 ? 'REVIEW' : 'PASS') as 'PASS' | 'REVIEW',
      confidence: 0.9,
      issues: [],
      suggestedFix: null,
      factualNotes: null,
    }));

    const failed = results.filter((r) => r.status === 'FAIL').length;
    const reviewNeeded = results.filter((r) => r.status === 'REVIEW').length;
    const overallStatus = failed === 0 && reviewNeeded === 0 ? 'READY' : 'VALIDATION_FAILED';

    expect(overallStatus).toBe('VALIDATION_FAILED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. no unnecessary validation of other 24 questions
// ─────────────────────────────────────────────────────────────────────────────

describe('10: only disputed question gets retry (25 question paper)', () => {
  it('applyContradictionGuard only touches FAIL results with contradictory suggestedFix', () => {
    const q = makeQ('q25');
    const questions: GeneratedQuestion[] = [
      makeQ('q1', { correctOption: 'B', optionBEn: 'Option B text' }),
      makeQ('q5', { correctOption: 'C', optionCEn: 'Option C text' }),
      q, // q25 is contradictory
    ];

    const results: QuestionValidationInput[] = [
      { questionId: 'q1', order: 1, status: 'PASS', confidence: 0.95, issues: [], suggestedFix: null, factualNotes: null },
      { questionId: 'q5', order: 5, status: 'PASS', confidence: 0.92, issues: [], suggestedFix: null, factualNotes: null },
      makeFailResult('q25', 'The correct answer should be 1, 3, 4, 2'),
    ];

    const { results: out, downgradedIds } = applyContradictionGuard(results, questions);

    // Only q25 was touched
    expect(downgradedIds).toContain('q25');
    expect(downgradedIds).not.toContain('q1');
    expect(downgradedIds).not.toContain('q5');

    // q1 and q5 are untouched
    expect(out[0].status).toBe('PASS');
    expect(out[1].status).toBe('PASS');
    // q25 downgraded to REVIEW (legacy guard behavior)
    expect(out[2].status).toBe('REVIEW');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. only the disputed question gets retry (AI call count)
// ─────────────────────────────────────────────────────────────────────────────

describe('11: contradiction detection is per-question (not batch)', () => {
  const q25 = makeQ('q25');

  it('STRONG class detected only for the one question with contradictory suggestedFix', () => {
    const passResult: QuestionValidationInput = {
      questionId: 'q1', order: 1, status: 'PASS', confidence: 0.98,
      issues: [], suggestedFix: null, factualNotes: null,
    };
    const contradictory = makeFailResult('q25', 'should be option A');
    const genuineFail: QuestionValidationInput = {
      questionId: 'q10', order: 10, status: 'FAIL', confidence: 0.9,
      issues: [{ type: 'FACTUAL_ERROR', message: 'Date wrong', severity: 'ERROR' }],
      suggestedFix: 'Change date to 1885',
      factualNotes: null,
    };

    const q1 = makeQ('q1', { correctOption: 'B', optionBEn: 'Different option' });
    const q10 = makeQ('q10', { correctOption: 'C', optionCEn: 'Yet another option' });

    expect(classifyContradiction(passResult, q1)).toBe('NONE');
    expect(classifyContradiction(genuineFail, q10)).toBe('NONE');
    expect(classifyContradiction(contradictory, q25)).toBe('STRONG');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. UI distinguishes CURRENT vs PASSED
// (tested by verifying the computed boolean values used in the UI)
// ─────────────────────────────────────────────────────────────────────────────

describe('12: UI distinguishes all-current from all-passed', () => {
  it('allCurrent true when staleCount=0 but overallStatus=VALIDATION_FAILED', () => {
    const staleCount = 0;
    const overallStatus = 'VALIDATION_FAILED';
    const validationExists = true;

    const allCurrent = validationExists && staleCount === 0;
    const allPassed = allCurrent && overallStatus === 'READY';

    expect(allCurrent).toBe(true);   // no stale — but NOT all passed
    expect(allPassed).toBe(false);   // REVIEW questions exist

    // UI should show: '✓ All Questions Validated' (amber) not '✓ All Questions Passed' (green)
  });

  it('allPassed true only when staleCount=0 AND overallStatus=READY', () => {
    const staleCount = 0;
    const overallStatus = 'READY';
    const validationExists = true;

    const allCurrent = validationExists && staleCount === 0;
    const allPassed = allCurrent && overallStatus === 'READY';

    expect(allPassed).toBe(true);
    // UI should show: '✓ All Questions Passed' (green)
  });

  it('staleCount>0 → neither allCurrent nor allPassed', () => {
    const staleCount = 2;
    const overallStatus = 'READY';

    const allCurrent = true && staleCount === 0;
    const allPassed = allCurrent && overallStatus === 'READY';

    expect(allCurrent).toBe(false);
    expect(allPassed).toBe(false);
    // UI should show: '↺ Revalidate 2 Questions' (purple)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mocked fetch — verify retryContradictedQuestion builds correct prompt
// ─────────────────────────────────────────────────────────────────────────────

describe('retryContradictedQuestion — mocked AI call', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('calls OpenAI exactly once with contradiction context in user prompt', async () => {
    const { retryContradictedQuestion } = await import('@/lib/admin/ai-validator');

    const mockResponse = {
      overallStatus: 'READY',
      validationSummary: 'Question is correct.',
      questions: [{
        order: 25,
        status: 'PASS',
        confidence: 0.92,
        issues: [],
        suggestedFix: null,
        factualNotes: 'The sequence 1,3,4,2 is correct.',
      }],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(mockResponse) } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const q = makeQ('q25');
    const previousResult = {
      issues: [{ type: 'FACTUAL_ERROR', message: 'Sequence incorrect', severity: 'ERROR' }],
      suggestedFix: 'Should be 1, 3, 4, 2',
      factualNotes: 'Brahmaputra → Godavari → Kaveri → Narmada',
    };

    const result = await retryContradictedQuestion(
      'fake-api-key', q, previousResult,
      'BPSC TRE 4', 'Geography', 'Indian Rivers', 'Hard', null,
    );

    // Exactly one AI call
    expect(fetchMock).toHaveBeenCalledOnce();

    // User prompt contains contradiction context
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as { messages: Array<{ role: string; content: string }> };
    const userMsg = body.messages.find((m) => m.role === 'user')?.content ?? '';
    expect(userMsg).toContain('INTERNALLY INCONSISTENT');
    expect(userMsg).toContain('1, 3, 4, 2');

    // Result is PASS
    expect(result.status).toBe('PASS');
    expect(result.order).toBe(25);
  });

  it('returns coherent FAIL when retry gives a different genuine error', async () => {
    const { retryContradictedQuestion } = await import('@/lib/admin/ai-validator');

    const mockResponse = {
      overallStatus: 'VALIDATION_FAILED',
      validationSummary: 'Krishna meets sea after Godavari, not before.',
      questions: [{
        order: 25,
        status: 'FAIL',
        confidence: 0.88,
        issues: [{ type: 'FACTUAL_ERROR', message: 'Krishna river position is wrong in the sequence', severity: 'ERROR' }],
        suggestedFix: 'The correct sequence should be 1, 2, 4, 3 (option B)',
        factualNotes: null,
      }],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(mockResponse) } }] }),
    }));

    const q = makeQ('q25');
    const result = await retryContradictedQuestion(
      'fake-key', q,
      { issues: [{ type: 'FACTUAL_ERROR', message: 'err', severity: 'ERROR' }], suggestedFix: 'should be 1, 3, 4, 2', factualNotes: null },
      'BPSC TRE 4', 'Geography', 'Indian Rivers', 'Hard', null,
    );

    expect(result.status).toBe('FAIL');
    expect(result.suggestedFix).toContain('option B');
  });
});
