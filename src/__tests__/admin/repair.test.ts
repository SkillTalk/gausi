/**
 * Unit tests for the single-question repair service.
 *
 * All DB calls and OpenAI (global.fetch) are mocked.
 * No real API credits are consumed.
 *
 * Coverage (per user requirements §15):
 *  1. REVIEW question can be repaired
 *  2. FAIL question can be repaired
 *  3. PASS question repair blocked
 *  4. Only selected question changes (others untouched)
 *  5. Other 24 questions remain unchanged
 *  6. Question order preserved (order field not modified)
 *  7. E option remains fixed server-side
 *  8. Invalid AI output rejected (structural validation)
 *  9. Duplicate repaired question rejected
 * 10. contentVersion increments
 * 11. Old validation becomes stale (test status → GENERATED)
 * 12. Published test repair blocked
 * 13. Repair audit recorded (QuestionRepairLog created)
 * 14. Revalidation required (test status GENERATED after repair)
 * 15. Repaired test can become READY (existing validate flow — covered by validation.test.ts)
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { db } from '@/lib/db';
import { repairQuestion, validateRepairedQuestion } from '@/lib/admin/repair.service';

// ─── Mock DB ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  db: {
    generatedTest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    generatedQuestion: {
      update: vi.fn(),
    },
    testValidation: {
      findUnique: vi.fn(),
    },
    questionValidationResult: {
      findFirst: vi.fn(),
    },
    questionRepairLog: {
      create: vi.fn(),
    },
  },
}));

// ─── Mock fetch (OpenAI) ──────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Typed mock helpers ───────────────────────────────────────────────────────

const mockTestFind = db.generatedTest.findUnique as MockedFunction<typeof db.generatedTest.findUnique>;
const mockTestUpdate = db.generatedTest.update as MockedFunction<typeof db.generatedTest.update>;
const mockQUpdate = db.generatedQuestion.update as MockedFunction<typeof db.generatedQuestion.update>;
const mockValFind = db.testValidation.findUnique as MockedFunction<typeof db.testValidation.findUnique>;
const mockQValFind = db.questionValidationResult.findFirst as MockedFunction<typeof db.questionValidationResult.findFirst>;
const mockLogCreate = db.questionRepairLog.create as MockedFunction<typeof db.questionRepairLog.create>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const Q_ID = 'q-review-1';
const OTHER_Q_ID = 'q-pass-2';
const TEST_ID = 'test-123';

function makeQuestion(id: string, order: number) {
  return {
    id,
    order,
    category: 'History',
    topic: 'Satyagrah',
    difficulty: 'Moderate',
    questionHi: `प्रश्न ${order} हिंदी`,
    questionEn: `Question ${order} English`,
    optionAHi: 'विकल्प A', optionBHi: 'विकल्प B', optionCHi: 'विकल्प C', optionDHi: 'विकल्प D',
    optionEHi: 'उत्तर नहीं देना चाहता',
    optionAEn: 'Option A', optionBEn: 'Option B', optionCEn: 'Option C', optionDEn: 'Option D',
    optionEEn: 'I do not want to answer',
    explanationHi: 'व्याख्या हिंदी',
    explanationEn: 'Explanation English',
    correctOption: 'B',
  };
}

const TARGET_QUESTION = makeQuestion(Q_ID, 5);
const OTHER_QUESTION = makeQuestion(OTHER_Q_ID, 6);

function makeTest(status: string, questions = [TARGET_QUESTION, OTHER_QUESTION]) {
  return {
    id: TEST_ID,
    exam: 'BPSC TRE 4',
    category: 'History',
    topic: 'Satyagrah',
    difficulty: 'Moderate',
    titleEn: 'Satyagrah Practice Paper',
    status,
    contentVersion: 3,
    questions,
  };
}

function makeValidation(id: string) {
  return { id, testId: TEST_ID };
}

function makeQVal(questionId: string, status: 'PASS' | 'FAIL' | 'REVIEW') {
  return {
    id: `qval-${questionId}`,
    validationId: 'val-1',
    questionId,
    order: 5,
    status,
    confidence: 0.6,
    issues: status !== 'PASS'
      ? [{ type: 'FACTUAL_ERROR', message: 'Mandela example is disputed', severity: 'ERROR' }]
      : [],
    suggestedFix: status !== 'PASS' ? 'Clarify the context.' : null,
    factualNotes: null,
  };
}

const VALID_AI_RESPONSE = {
  questionHi: 'नया प्रश्न सत्याग्रह पर',
  questionEn: 'New question on Satyagrah',
  optionAHi: 'नया विकल्प A', optionBHi: 'नया विकल्प B',
  optionCHi: 'नया विकल्प C', optionDHi: 'नया विकल्प D',
  optionAEn: 'New Option A', optionBEn: 'New Option B',
  optionCEn: 'New Option C', optionDEn: 'New Option D',
  explanationHi: 'नई व्याख्या',
  explanationEn: 'New explanation',
  correctOption: 'A',
};

function mockOpenAI(response: object) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(response) } }],
    }),
  });
}

function mockOpenAIBadJSON() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'NOT JSON' } }],
    }),
  });
}

// ─── validateRepairedQuestion (pure utility) ──────────────────────────────────

describe('validateRepairedQuestion', () => {
  it('returns valid for a well-formed repaired question', () => {
    const result = validateRepairedQuestion(VALID_AI_RESPONSE, []);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing required fields', () => {
    const { questionHi: _unused, ...rest } = VALID_AI_RESPONSE;
    void _unused;
    const result = validateRepairedQuestion(rest as Record<string, unknown>, []);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('questionHi'))).toBe(true);
  });

  it('rejects correctOption = E', () => {
    const result = validateRepairedQuestion({ ...VALID_AI_RESPONSE, correctOption: 'E' }, []);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('correctOption'))).toBe(true);
  });

  // Test 9: Duplicate question text rejected
  it('rejects a question whose Hindi text duplicates an existing question', () => {
    const existing = ['नया प्रश्न सत्याग्रह पर', 'some other question'];
    const result = validateRepairedQuestion(VALID_AI_RESPONSE, existing);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicate'))).toBe(true);
  });

  it('rejects a question whose English text duplicates an existing question', () => {
    const existing = ['New question on Satyagrah'];
    const result = validateRepairedQuestion(VALID_AI_RESPONSE, existing);
    expect(result.valid).toBe(false);
  });

  it('accepts question when texts are different from existing', () => {
    const existing = ['प्रश्न 5 हिंदी', 'Question 5 English', 'प्रश्न 6 हिंदी', 'Question 6 English'];
    const result = validateRepairedQuestion(VALID_AI_RESPONSE, existing);
    expect(result.valid).toBe(true);
  });
});

// ─── repairQuestion ───────────────────────────────────────────────────────────

describe('repairQuestion', () => {
  // Test 12: Published test repair blocked
  it('blocks repair of a PUBLISHED test', async () => {
    mockTestFind.mockResolvedValue(makeTest('PUBLISHED') as never);
    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('immutable');
    expect(mockQUpdate).not.toHaveBeenCalled();
  });

  it('blocks repair of an ARCHIVED test', async () => {
    mockTestFind.mockResolvedValue(makeTest('ARCHIVED') as never);
    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    expect(mockQUpdate).not.toHaveBeenCalled();
  });

  it('returns error when test not found', async () => {
    mockTestFind.mockResolvedValue(null);
    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe('LOAD');
  });

  it('returns error when question not found in test', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(null);
    const result = await repairQuestion(TEST_ID, 'nonexistent-q', 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe('LOAD');
  });

  // Test 3: PASS question blocked
  it('blocks repair of a PASS question', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'PASS') as never);
    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('passed validation');
    expect(mockQUpdate).not.toHaveBeenCalled();
  });

  // Test 1: REVIEW question can be repaired
  it('repairs a REVIEW question (AUTO_FIX mode)', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI(VALID_AI_RESPONSE);
    mockLogCreate.mockResolvedValue({ id: 'log-1' } as never);
    mockQUpdate.mockResolvedValue({} as never);
    mockTestUpdate.mockResolvedValue({} as never);

    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.questionId).toBe(Q_ID);
      expect(result.repairLogId).toBe('log-1');
    }
  });

  // Test 2: FAIL question can be repaired
  it('repairs a FAIL question (REPLACE mode)', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'FAIL') as never);
    mockOpenAI(VALID_AI_RESPONSE);
    mockLogCreate.mockResolvedValue({ id: 'log-2' } as never);
    mockQUpdate.mockResolvedValue({} as never);
    mockTestUpdate.mockResolvedValue({} as never);

    const result = await repairQuestion(TEST_ID, Q_ID, 'REPLACE', undefined, 'sk-test');
    expect(result.ok).toBe(true);
  });

  // Test 4 + 5: Only selected question changes; others unchanged
  it('only updates the target question — no other DB writes for other questions', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI(VALID_AI_RESPONSE);
    mockLogCreate.mockResolvedValue({ id: 'log-3' } as never);
    mockQUpdate.mockResolvedValue({} as never);
    mockTestUpdate.mockResolvedValue({} as never);

    await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');

    // Only one question update should have been called
    expect(mockQUpdate).toHaveBeenCalledTimes(1);
    // And it must target the correct question id
    expect(mockQUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: Q_ID } }),
    );
  });

  // Test 6: Question order preserved (order field not in the update data)
  it('does not modify the question order field during repair', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI(VALID_AI_RESPONSE);
    mockLogCreate.mockResolvedValue({ id: 'log-4' } as never);
    mockQUpdate.mockResolvedValue({} as never);
    mockTestUpdate.mockResolvedValue({} as never);

    await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');

    const updateCall = mockQUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall?.data).not.toHaveProperty('order');
    expect(updateCall?.data).not.toHaveProperty('id');
  });

  // Test 7: E option remains fixed server-side
  it('always enforces the server-side E option text regardless of AI output', async () => {
    const aiWithWrongE = {
      ...VALID_AI_RESPONSE,
      // AI tries to override E — server must ignore it
      optionEHi: 'WRONG E HINDI',
      optionEEn: 'WRONG E ENGLISH',
    };
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI(aiWithWrongE);
    mockLogCreate.mockResolvedValue({ id: 'log-5' } as never);
    mockQUpdate.mockResolvedValue({} as never);
    mockTestUpdate.mockResolvedValue({} as never);

    await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');

    const updateCall = mockQUpdate.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(updateCall?.data?.optionEHi).toBe('उत्तर नहीं देना चाहता');
    expect(updateCall?.data?.optionEEn).toBe('I do not want to answer');
  });

  // Test 8: Invalid AI output rejected
  it('returns STRUCT_CHECK error when AI returns invalid JSON', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAIBadJSON();

    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe('AI_CALL');
    expect(mockQUpdate).not.toHaveBeenCalled();
  });

  it('returns STRUCT_CHECK error when AI returns missing required fields', async () => {
    const badAI = { questionHi: 'हिंदी', questionEn: 'English' }; // missing options/explanation
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI(badAI);

    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe('STRUCT_CHECK');
    expect(mockQUpdate).not.toHaveBeenCalled();
  });

  it('returns STRUCT_CHECK error when AI returns correctOption=E', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI({ ...VALID_AI_RESPONSE, correctOption: 'E' });

    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe('STRUCT_CHECK');
  });

  // Test 9 (API layer): Duplicate repaired question rejected
  it('rejects repaired question whose text matches an existing question', async () => {
    // AI returns the exact same question text as OTHER_QUESTION
    const duplicateAI = {
      ...VALID_AI_RESPONSE,
      questionHi: OTHER_QUESTION.questionHi, // duplicate!
      questionEn: 'Something different',
    };
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI(duplicateAI);

    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe('STRUCT_CHECK');
    expect(mockQUpdate).not.toHaveBeenCalled();
  });

  // Test 10: contentVersion increments
  it('increments GeneratedTest.contentVersion after successful repair', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI(VALID_AI_RESPONSE);
    mockLogCreate.mockResolvedValue({ id: 'log-6' } as never);
    mockQUpdate.mockResolvedValue({} as never);
    mockTestUpdate.mockResolvedValue({} as never);

    await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');

    expect(mockTestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contentVersion: { increment: 1 },
        }),
      }),
    );
  });

  // Test 11 + 14: Validation becomes stale → status set to GENERATED
  it('sets test status to GENERATED after repair (validation now stale)', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI(VALID_AI_RESPONSE);
    mockLogCreate.mockResolvedValue({ id: 'log-7' } as never);
    mockQUpdate.mockResolvedValue({} as never);
    mockTestUpdate.mockResolvedValue({} as never);

    await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');

    expect(mockTestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'GENERATED' }),
      }),
    );
  });

  // Test 13: Repair audit recorded
  it('creates a QuestionRepairLog entry with correct data', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockOpenAI(VALID_AI_RESPONSE);
    mockLogCreate.mockResolvedValue({ id: 'log-8' } as never);
    mockQUpdate.mockResolvedValue({} as never);
    mockTestUpdate.mockResolvedValue({} as never);

    await repairQuestion(TEST_ID, Q_ID, 'REPLACE', 'Keep focused on South Africa', 'sk-test');

    expect(mockLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          testId: TEST_ID,
          questionId: Q_ID,
          repairMode: 'REPLACE',
          adminInstruction: 'Keep focused on South Africa',
        }),
      }),
    );
  });

  it('repairs a REVIEW question even when no prior TestValidation exists', async () => {
    // Test has never been validated — no validation context available
    mockTestFind.mockResolvedValue(makeTest('GENERATED') as never);
    mockValFind.mockResolvedValue(null); // no validation
    mockOpenAI(VALID_AI_RESPONSE);
    mockLogCreate.mockResolvedValue({ id: 'log-9' } as never);
    mockQUpdate.mockResolvedValue({} as never);
    mockTestUpdate.mockResolvedValue({} as never);

    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    // Should succeed because no validation = no PASS status to block on
    expect(result.ok).toBe(true);
  });

  it('returns AI_CALL error when OpenAI returns HTTP error', async () => {
    mockTestFind.mockResolvedValue(makeTest('VALIDATION_FAILED') as never);
    mockValFind.mockResolvedValue(makeValidation('val-1') as never);
    mockQValFind.mockResolvedValue(makeQVal(Q_ID, 'REVIEW') as never);
    mockFetch.mockResolvedValue({ ok: false, status: 429, text: async () => 'Rate limit' });

    const result = await repairQuestion(TEST_ID, Q_ID, 'AUTO_FIX', undefined, 'sk-test');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe('AI_CALL');
  });
});
