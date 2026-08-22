import { describe, it, expect } from 'vitest';
import { runDeterministicValidation } from '@/lib/admin/deterministic-validator';
import type { GeneratedQuestion } from '@/types/generated-test';

const OPTION_E_HI = 'उत्तर नहीं देना चाहता';
const OPTION_E_EN = 'I do not want to answer';

function makeQuestion(overrides: Partial<GeneratedQuestion> = {}): GeneratedQuestion {
  return {
    id: `q-${Math.random().toString(36).slice(2, 6)}`,
    testId: 'test-1',
    order: 1,
    category: 'History',
    topic: 'Revolt of 1857',
    difficulty: 'Moderate',
    questionType: 'DIRECT',
    questionHi: '1857 के विद्रोह का नेता कौन था?',
    optionAHi: 'मंगल पांडे',
    optionBHi: 'नाना साहब',
    optionCHi: 'तात्या टोपे',
    optionDHi: 'लक्ष्मीबाई',
    optionEHi: OPTION_E_HI,
    explanationHi: 'मंगल पांडे ने विद्रोह की शुरुआत की।',
    questionEn: 'Who led the Revolt of 1857?',
    optionAEn: 'Mangal Pandey',
    optionBEn: 'Nana Saheb',
    optionCEn: 'Tatya Tope',
    optionDEn: 'Laxmibai',
    optionEEn: OPTION_E_EN,
    explanationEn: 'Mangal Pandey initiated the revolt.',
    correctOption: 'A',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeQuestions(count: number, baseOverrides: Partial<GeneratedQuestion> = {}): GeneratedQuestion[] {
  return Array.from({ length: count }, (_, i) =>
    makeQuestion({
      id: `q-${i}`,
      order: i + 1,
      questionHi: `प्रश्न ${i + 1}: 1857 के विद्रोह का नेता कौन था?`,
      questionEn: `Question ${i + 1}: Who led the Revolt of 1857?`,
      ...baseOverrides,
    }),
  );
}

describe('runDeterministicValidation — passing cases', () => {
  it('passes a single valid question', () => {
    const q = makeQuestion({ id: 'q1', order: 1 });
    const { results, hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(false);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('PASS');
    expect(results[0].issues.filter((i) => i.severity === 'ERROR')).toHaveLength(0);
  });

  it('passes a batch of 5 valid questions', () => {
    const { results, hasFailed } = runDeterministicValidation(makeQuestions(5));
    expect(hasFailed).toBe(false);
    expect(results.every((r) => r.status === 'PASS')).toBe(true);
  });

  it('includes all passing questions in cleanQuestionIds', () => {
    const qs = makeQuestions(3);
    const { cleanQuestionIds } = runDeterministicValidation(qs);
    expect(cleanQuestionIds.size).toBe(3);
    for (const q of qs) {
      expect(cleanQuestionIds.has(q.id)).toBe(true);
    }
  });
});

describe('runDeterministicValidation — correctOption checks', () => {
  it('fails when correctOption is E', () => {
    const q = makeQuestion({ id: 'q1', correctOption: 'E' });
    const { results: res, hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
    expect(res[0].status).toBe('FAIL');
    expect(res[0].issues.some((i) => i.type === 'INVALID_CORRECT_OPTION')).toBe(true);
  });

  it('fails when correctOption is lowercase "a"', () => {
    const q = makeQuestion({ id: 'q1', correctOption: 'a' });
    const { results, hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
    expect(results[0].issues.some((i) => i.type === 'INVALID_CORRECT_OPTION')).toBe(true);
  });

  it('fails when correctOption is empty string', () => {
    const q = makeQuestion({ id: 'q1', correctOption: '' });
    const { hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
  });

  it('accepts all valid options A B C D', () => {
    for (const opt of ['A', 'B', 'C', 'D']) {
      const q = makeQuestion({ id: `q-${opt}`, correctOption: opt });
      const { hasFailed } = runDeterministicValidation([q]);
      expect(hasFailed).toBe(false);
    }
  });
});

describe('runDeterministicValidation — Option E checks', () => {
  it('fails when optionEHi is wrong', () => {
    const q = makeQuestion({ id: 'q1', optionEHi: 'कुछ और' });
    const { results, hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
    expect(results[0].issues.some((i) => i.type === 'WRONG_OPTION_E')).toBe(true);
  });

  it('fails when optionEEn is wrong', () => {
    const q = makeQuestion({ id: 'q1', optionEEn: 'I do not know' });
    const { results, hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
    expect(results[0].issues.some((i) => i.type === 'WRONG_OPTION_E')).toBe(true);
  });

  it('fails when both E options are wrong', () => {
    const q = makeQuestion({ id: 'q1', optionEHi: 'गलत', optionEEn: 'wrong' });
    const { results } = runDeterministicValidation([q]);
    const eIssues = results[0].issues.filter((i) => i.type === 'WRONG_OPTION_E');
    expect(eIssues).toHaveLength(2);
  });
});

describe('runDeterministicValidation — missing fields', () => {
  it('fails when questionHi is empty', () => {
    const q = makeQuestion({ id: 'q1', questionHi: '' });
    const { results, hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
    expect(results[0].issues.some((i) => i.type === 'MISSING_FIELD' && i.message.includes('questionHi'))).toBe(true);
  });

  it('fails when questionEn is missing', () => {
    const q = makeQuestion({ id: 'q1', questionEn: '   ' });
    const { results, hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
    expect(results[0].issues.some((i) => i.type === 'MISSING_FIELD')).toBe(true);
  });

  it('fails when explanationHi is empty', () => {
    const q = makeQuestion({ id: 'q1', explanationHi: '' });
    const { hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
  });

  it('fails when explanationEn is empty', () => {
    const q = makeQuestion({ id: 'q1', explanationEn: '' });
    const { hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
  });

  it('fails when optionBHi is empty', () => {
    const q = makeQuestion({ id: 'q1', optionBHi: '' });
    const { hasFailed } = runDeterministicValidation([q]);
    expect(hasFailed).toBe(true);
  });
});

describe('runDeterministicValidation — duplicate detection', () => {
  it('flags exact duplicate Hindi question text', () => {
    const q1 = makeQuestion({ id: 'q1', order: 1, questionHi: '1857 के विद्रोह का नेता कौन था?' });
    const q2 = makeQuestion({ id: 'q2', order: 2, questionHi: '1857 के विद्रोह का नेता कौन था?' });
    const { results, hasFailed } = runDeterministicValidation([q1, q2]);
    expect(hasFailed).toBe(true);
    expect(results[1].issues.some((i) => i.type === 'DUPLICATE_QUESTION')).toBe(true);
  });

  it('flags exact duplicate English question text', () => {
    const q1 = makeQuestion({ id: 'q1', order: 1, questionEn: 'Who led the revolt?' });
    const q2 = makeQuestion({ id: 'q2', order: 2, questionEn: 'Who led the revolt?' });
    const { results, hasFailed } = runDeterministicValidation([q1, q2]);
    expect(hasFailed).toBe(true);
    expect(results[1].issues.some((i) => i.type === 'DUPLICATE_QUESTION')).toBe(true);
  });

  it('ignores case and extra whitespace in duplicate check', () => {
    const q1 = makeQuestion({ id: 'q1', order: 1, questionEn: 'who led the revolt?' });
    const q2 = makeQuestion({ id: 'q2', order: 2, questionEn: '  WHO  LED  THE  REVOLT?  ' });
    const { hasFailed } = runDeterministicValidation([q1, q2]);
    expect(hasFailed).toBe(true);
  });

  it('does NOT flag different questions as duplicates', () => {
    const q1 = makeQuestion({ id: 'q1', order: 1, questionHi: '1857 के विद्रोह का नेता कौन था?', questionEn: 'Who led the Revolt of 1857?' });
    const q2 = makeQuestion({ id: 'q2', order: 2, questionHi: '1857 का विद्रोह कब शुरू हुआ?', questionEn: 'When did the Revolt of 1857 begin?' });
    const { hasFailed } = runDeterministicValidation([q1, q2]);
    expect(hasFailed).toBe(false);
  });

  it('excludes duplicated question from cleanQuestionIds', () => {
    const q1 = makeQuestion({ id: 'q1', order: 1 });
    const q2 = makeQuestion({ id: 'q2', order: 2, questionHi: q1.questionHi, questionEn: q1.questionEn });
    const { cleanQuestionIds } = runDeterministicValidation([q1, q2]);
    expect(cleanQuestionIds.has('q1')).toBe(true);
    expect(cleanQuestionIds.has('q2')).toBe(false);
  });
});

describe('runDeterministicValidation — mixed results', () => {
  it('correctly separates passing and failing questions', () => {
    const q1 = makeQuestion({ id: 'q1', order: 1, questionHi: 'प्रश्न 1', questionEn: 'Question 1' }); // valid
    const q2 = makeQuestion({ id: 'q2', order: 2, questionHi: 'प्रश्न 2', questionEn: 'Question 2', correctOption: 'E' }); // invalid
    const q3 = makeQuestion({ id: 'q3', order: 3, questionHi: 'प्रश्न 3', questionEn: 'Question 3' }); // valid
    const { results, hasFailed, cleanQuestionIds } = runDeterministicValidation([q1, q2, q3]);
    expect(hasFailed).toBe(true);
    expect(results[0].status).toBe('PASS');
    expect(results[1].status).toBe('FAIL');
    expect(results[2].status).toBe('PASS');
    expect(cleanQuestionIds.has('q1')).toBe(true);
    expect(cleanQuestionIds.has('q2')).toBe(false);
    expect(cleanQuestionIds.has('q3')).toBe(true);
  });

  it('passes the order number through correctly', () => {
    const qs = makeQuestions(3);
    const { results } = runDeterministicValidation(qs);
    expect(results.map((r) => r.order)).toEqual([1, 2, 3]);
  });
});
