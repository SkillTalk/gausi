/**
 * AI Validator tests — all OpenAI calls are mocked.
 * No real API credits consumed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergeValidationResults } from '@/lib/admin/ai-validator';
import type { GeneratedQuestion } from '@/types/generated-test';
import type {
  QuestionValidationInput,
  AIQuestionValidation,
  ValidationIssue,
} from '@/types/validation';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<GeneratedQuestion> = {}): GeneratedQuestion {
  return {
    id: 'q1',
    testId: 'test-1',
    order: 1,
    category: 'History',
    topic: 'Revolt of 1857',
    difficulty: 'Moderate',
    questionHi: '1857 के विद्रोह का नेता कौन था?',
    optionAHi: 'मंगल पांडे',
    optionBHi: 'नाना साहब',
    optionCHi: 'तात्या टोपे',
    optionDHi: 'लक्ष्मीबाई',
    optionEHi: 'उत्तर नहीं देना चाहता',
    explanationHi: 'मंगल पांडे ने विद्रोह की शुरुआत की।',
    questionEn: 'Who led the Revolt of 1857?',
    optionAEn: 'Mangal Pandey',
    optionBEn: 'Nana Saheb',
    optionCEn: 'Tatya Tope',
    optionDEn: 'Laxmibai',
    optionEEn: 'I do not want to answer',
    explanationEn: 'Mangal Pandey initiated the revolt.',
    correctOption: 'A',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeDeterministicPass(q: GeneratedQuestion): QuestionValidationInput {
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

function makeDeterministicFail(q: GeneratedQuestion, issue: ValidationIssue): QuestionValidationInput {
  return {
    questionId: q.id,
    order: q.order,
    status: 'FAIL',
    confidence: 1.0,
    issues: [issue],
    suggestedFix: null,
    factualNotes: null,
  };
}

// ─── mergeValidationResults tests ─────────────────────────────────────────────

describe('mergeValidationResults', () => {
  it('keeps FAIL for deterministic failures regardless of AI result', () => {
    const q = makeQuestion({ id: 'q1', order: 1 });
    const detResult = makeDeterministicFail(q, {
      type: 'INVALID_CORRECT_OPTION',
      message: 'correctOption must be A-D',
      severity: 'ERROR',
    });

    const aiResult: AIQuestionValidation = {
      order: 1,
      status: 'PASS', // AI says PASS, but deterministic already failed
      confidence: 0.9,
      issues: [],
      suggestedFix: null,
      factualNotes: null,
    };

    const merged = mergeValidationResults(
      [detResult],
      new Map([[1, aiResult]]),
      new Set(), // empty — q1 is NOT in cleanQuestionIds
    );

    expect(merged[0].status).toBe('FAIL');
    expect(merged[0].issues).toHaveLength(1);
    expect(merged[0].issues[0].type).toBe('INVALID_CORRECT_OPTION');
  });

  it('applies AI status to deterministic-passing question', () => {
    const q = makeQuestion({ id: 'q1', order: 1 });
    const detResult = makeDeterministicPass(q);

    const aiResult: AIQuestionValidation = {
      order: 1,
      status: 'REVIEW',
      confidence: 0.7,
      issues: [{ type: 'FACTUAL_ERROR', message: 'Date may be incorrect', severity: 'WARNING' }],
      suggestedFix: 'Verify the date',
      factualNotes: 'Consult NCERT chapter 5',
    };

    const merged = mergeValidationResults(
      [detResult],
      new Map([[1, aiResult]]),
      new Set(['q1']),
    );

    expect(merged[0].status).toBe('REVIEW');
    expect(merged[0].confidence).toBe(0.7);
    expect(merged[0].suggestedFix).toBe('Verify the date');
    expect(merged[0].factualNotes).toBe('Consult NCERT chapter 5');
  });

  it('applies FAIL status from AI when question has factual error', () => {
    const q = makeQuestion({ id: 'q1', order: 1 });
    const detResult = makeDeterministicPass(q);

    const aiResult: AIQuestionValidation = {
      order: 1,
      status: 'FAIL',
      confidence: 0.92,
      issues: [{ type: 'FACTUAL_ERROR', message: 'Mangal Pandey was not the primary leader', severity: 'ERROR' }],
      suggestedFix: 'Change correct option or revise question',
      factualNotes: 'Multiple leaders were involved',
    };

    const merged = mergeValidationResults(
      [detResult],
      new Map([[1, aiResult]]),
      new Set(['q1']),
    );

    expect(merged[0].status).toBe('FAIL');
  });

  it('merges issues from both deterministic and AI', () => {
    const q = makeQuestion({ id: 'q1', order: 1 });
    const detIssue: ValidationIssue = { type: 'MISSING_FIELD', message: 'field empty', severity: 'WARNING' };
    // Make it pass deterministic to allow AI merge
    const detResult: QuestionValidationInput = {
      questionId: q.id,
      order: 1,
      status: 'PASS',
      confidence: 0.95,
      issues: [detIssue],
      suggestedFix: null,
      factualNotes: null,
    };

    const aiIssue: ValidationIssue = { type: 'AMBIGUITY', message: 'Two plausible answers', severity: 'WARNING' };
    const aiResult: AIQuestionValidation = {
      order: 1,
      status: 'REVIEW',
      confidence: 0.65,
      issues: [aiIssue],
      suggestedFix: null,
      factualNotes: null,
    };

    const merged = mergeValidationResults(
      [detResult],
      new Map([[1, aiResult]]),
      new Set(['q1']),
    );

    expect(merged[0].issues).toHaveLength(2);
    expect(merged[0].issues.map((i) => i.type)).toContain('MISSING_FIELD');
    expect(merged[0].issues.map((i) => i.type)).toContain('AMBIGUITY');
  });

  it('keeps PASS from AI when no issues found', () => {
    const q = makeQuestion({ id: 'q1', order: 1 });
    const detResult = makeDeterministicPass(q);
    const aiResult: AIQuestionValidation = {
      order: 1,
      status: 'PASS',
      confidence: 0.98,
      issues: [],
      suggestedFix: null,
      factualNotes: null,
    };

    const merged = mergeValidationResults(
      [detResult],
      new Map([[1, aiResult]]),
      new Set(['q1']),
    );

    expect(merged[0].status).toBe('PASS');
    expect(merged[0].issues).toHaveLength(0);
  });

  it('handles missing AI result gracefully (keeps deterministic)', () => {
    const q = makeQuestion({ id: 'q1', order: 1 });
    const detResult = makeDeterministicPass(q);

    const merged = mergeValidationResults(
      [detResult],
      new Map(), // AI returned nothing
      new Set(['q1']),
    );

    expect(merged[0].status).toBe('PASS');
    expect(merged[0].confidence).toBe(0.95);
  });

  it('handles multiple questions with mixed results', () => {
    const q1 = makeQuestion({ id: 'q1', order: 1 }); // deterministic fail
    const q2 = makeQuestion({ id: 'q2', order: 2 }); // AI REVIEW
    const q3 = makeQuestion({ id: 'q3', order: 3 }); // AI PASS

    const det1 = makeDeterministicFail(q1, { type: 'INVALID_CORRECT_OPTION', message: 'E not allowed', severity: 'ERROR' });
    const det2 = makeDeterministicPass(q2);
    const det3 = makeDeterministicPass(q3);

    const aiResults = new Map<number, AIQuestionValidation>([
      [2, { order: 2, status: 'REVIEW', confidence: 0.6, issues: [{ type: 'NEAR_DUPLICATE', message: 'Similar to Q3', severity: 'WARNING' }], suggestedFix: null, factualNotes: null }],
      [3, { order: 3, status: 'PASS', confidence: 0.95, issues: [], suggestedFix: null, factualNotes: null }],
    ]);

    const merged = mergeValidationResults(
      [det1, det2, det3],
      aiResults,
      new Set(['q2', 'q3']), // q1 is not clean
    );

    expect(merged[0].status).toBe('FAIL');   // deterministic FAIL preserved
    expect(merged[1].status).toBe('REVIEW'); // AI REVIEW applied
    expect(merged[2].status).toBe('PASS');   // AI PASS applied
  });
});

// ─── Validation status transition logic ───────────────────────────────────────

describe('Validation status transitions', () => {
  it('READY rule: status = READY only when all questions PASS', () => {
    const results: QuestionValidationInput[] = [
      { questionId: 'q1', order: 1, status: 'PASS', confidence: 1.0, issues: [], suggestedFix: null, factualNotes: null },
      { questionId: 'q2', order: 2, status: 'PASS', confidence: 1.0, issues: [], suggestedFix: null, factualNotes: null },
    ];

    const failed = results.filter((r) => r.status === 'FAIL').length;
    const reviewNeeded = results.filter((r) => r.status === 'REVIEW').length;
    const overallStatus = failed === 0 && reviewNeeded === 0 ? 'READY' : 'VALIDATION_FAILED';

    expect(overallStatus).toBe('READY');
  });

  it('VALIDATION_FAILED rule: any FAIL question triggers failure', () => {
    const results: QuestionValidationInput[] = [
      { questionId: 'q1', order: 1, status: 'PASS', confidence: 1.0, issues: [], suggestedFix: null, factualNotes: null },
      { questionId: 'q2', order: 2, status: 'FAIL', confidence: 1.0, issues: [{ type: 'FACTUAL_ERROR', message: 'err', severity: 'ERROR' }], suggestedFix: null, factualNotes: null },
    ];

    const failed = results.filter((r) => r.status === 'FAIL').length;
    const reviewNeeded = results.filter((r) => r.status === 'REVIEW').length;
    const overallStatus = failed === 0 && reviewNeeded === 0 ? 'READY' : 'VALIDATION_FAILED';

    expect(overallStatus).toBe('VALIDATION_FAILED');
  });

  it('VALIDATION_FAILED rule: any REVIEW question triggers failure', () => {
    const results: QuestionValidationInput[] = [
      { questionId: 'q1', order: 1, status: 'PASS', confidence: 1.0, issues: [], suggestedFix: null, factualNotes: null },
      { questionId: 'q2', order: 2, status: 'REVIEW', confidence: 0.6, issues: [{ type: 'AMBIGUITY', message: 'ambiguous', severity: 'WARNING' }], suggestedFix: null, factualNotes: null },
    ];

    const failed = results.filter((r) => r.status === 'FAIL').length;
    const reviewNeeded = results.filter((r) => r.status === 'REVIEW').length;
    const overallStatus = failed === 0 && reviewNeeded === 0 ? 'READY' : 'VALIDATION_FAILED';

    expect(overallStatus).toBe('VALIDATION_FAILED');
  });

  it('VALIDATION_FAILED rule: both FAIL and REVIEW present', () => {
    const results: QuestionValidationInput[] = [
      { questionId: 'q1', order: 1, status: 'FAIL', confidence: 1.0, issues: [{ type: 'FACTUAL_ERROR', message: 'err', severity: 'ERROR' }], suggestedFix: null, factualNotes: null },
      { questionId: 'q2', order: 2, status: 'REVIEW', confidence: 0.5, issues: [], suggestedFix: null, factualNotes: null },
      { questionId: 'q3', order: 3, status: 'PASS', confidence: 1.0, issues: [], suggestedFix: null, factualNotes: null },
    ];

    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const reviewNeeded = results.filter((r) => r.status === 'REVIEW').length;
    const overallStatus = failed === 0 && reviewNeeded === 0 ? 'READY' : 'VALIDATION_FAILED';

    expect(overallStatus).toBe('VALIDATION_FAILED');
    expect(passed).toBe(1);
    expect(failed).toBe(1);
    expect(reviewNeeded).toBe(1);
  });
});

// ─── Mocked OpenAI fetch behaviour ───────────────────────────────────────────

describe('AI validator — mocked fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('runAIValidation calls fetch with correct structure', async () => {
    const { runAIValidation } = await import('@/lib/admin/ai-validator');

    const mockResponse: { overallStatus: string; validationSummary: string; questions: AIQuestionValidation[] } = {
      overallStatus: 'READY',
      validationSummary: 'All questions passed.',
      questions: [
        { order: 1, status: 'PASS', confidence: 0.95, issues: [], suggestedFix: null, factualNotes: null },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      }),
    } as unknown as Response);

    vi.stubGlobal('fetch', fetchMock);

    const q = makeQuestion({ id: 'q1', order: 1 });
    const result = await runAIValidation('test-api-key', [q], 'BPSC TRE 4', 'History', 'Revolt of 1857', 'Moderate');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as { model: string; temperature: number };
    expect(body.model).toBe('gpt-4o');
    expect(body.temperature).toBe(0.1);

    expect(result.overallStatus).toBe('READY');
    expect(result.questionResults.get(1)?.status).toBe('PASS');
  });

  it('runAIValidation returns VALIDATION_FAILED when AI flags issues', async () => {
    const { runAIValidation } = await import('@/lib/admin/ai-validator');

    const mockResponse: { overallStatus: string; validationSummary: string; questions: AIQuestionValidation[] } = {
      overallStatus: 'VALIDATION_FAILED',
      validationSummary: '1 question failed.',
      questions: [
        {
          order: 1,
          status: 'FAIL',
          confidence: 0.88,
          issues: [{ type: 'FACTUAL_ERROR', message: 'Incorrect date', severity: 'ERROR' }],
          suggestedFix: 'Correct the date',
          factualNotes: 'The actual date is 1857',
        },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(mockResponse) } }] }),
    }));

    const q = makeQuestion({ id: 'q1', order: 1 });
    const result = await runAIValidation('test-key', [q], 'BPSC TRE 4', 'History', 'Revolt of 1857', 'Moderate');

    expect(result.overallStatus).toBe('VALIDATION_FAILED');
    expect(result.questionResults.get(1)?.status).toBe('FAIL');
    expect(result.questionResults.get(1)?.issues[0].type).toBe('FACTUAL_ERROR');
  });

  it('runAIValidation throws when OpenAI returns non-200', async () => {
    const { runAIValidation } = await import('@/lib/admin/ai-validator');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limit exceeded'),
    }));

    const q = makeQuestion({ id: 'q1', order: 1 });
    await expect(
      runAIValidation('test-key', [q], 'BPSC TRE 4', 'History', 'Revolt of 1857', 'Moderate'),
    ).rejects.toThrow('429');
  });

  it('runAIValidation throws when AI returns wrong question count', async () => {
    const { runAIValidation } = await import('@/lib/admin/ai-validator');

    const mockResponse = {
      overallStatus: 'READY',
      validationSummary: 'Done.',
      questions: [], // 0 results for 1 question — mismatch
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(mockResponse) } }] }),
    }));

    const q = makeQuestion({ id: 'q1', order: 1 });
    await expect(
      runAIValidation('test-key', [q], 'BPSC TRE 4', 'History', 'Revolt of 1857', 'Moderate'),
    ).rejects.toThrow('expected 1');
  });

  it('runAIValidation throws on invalid JSON response', async () => {
    const { runAIValidation } = await import('@/lib/admin/ai-validator');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'not json at all' } }] }),
    }));

    const q = makeQuestion({ id: 'q1', order: 1 });
    await expect(
      runAIValidation('test-key', [q], 'BPSC TRE 4', 'History', 'Revolt of 1857', 'Moderate'),
    ).rejects.toThrow();
  });

  it('runAIValidation handles REVIEW status correctly', async () => {
    const { runAIValidation } = await import('@/lib/admin/ai-validator');

    const mockResponse: { overallStatus: string; validationSummary: string; questions: AIQuestionValidation[] } = {
      overallStatus: 'VALIDATION_FAILED',
      validationSummary: '1 question needs review.',
      questions: [
        {
          order: 1,
          status: 'REVIEW',
          confidence: 0.6,
          issues: [{ type: 'AMBIGUITY', message: 'Two valid options possible', severity: 'WARNING' }],
          suggestedFix: 'Clarify the question stem',
          factualNotes: null,
        },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: JSON.stringify(mockResponse) } }] }),
    }));

    const q = makeQuestion({ id: 'q1', order: 1 });
    const result = await runAIValidation('test-key', [q], 'BPSC TRE 4', 'History', 'Revolt of 1857', 'Moderate');

    expect(result.overallStatus).toBe('VALIDATION_FAILED');
    expect(result.questionResults.get(1)?.status).toBe('REVIEW');
    expect(result.questionResults.get(1)?.suggestedFix).toBe('Clarify the question stem');
  });
});
