import { describe, it, expect } from 'vitest';
import { validateAIOutput } from '@/lib/admin/question-validator';
import type { AIGenerationResult } from '@/types/generated-test';

import type { QuestionType } from '@/types/generated-test';

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    order: 1,
    category: 'Leaders',
    topic: 'Revolt of 1857',
    difficulty: 'Beginner',
    questionType: 'DIRECT' as QuestionType,
    questionHi: '1857 के विद्रोह का नेता कौन था?',
    optionAHi: 'मंगल पांडे',
    optionBHi: 'नाना साहब',
    optionCHi: 'तात्या टोपे',
    optionDHi: 'लक्ष्मीबाई',
    explanationHi: 'मंगल पांडे ने विद्रोह की शुरुआत की।',
    questionEn: 'Who led the Revolt of 1857?',
    optionAEn: 'Mangal Pandey',
    optionBEn: 'Nana Saheb',
    optionCEn: 'Tatya Tope',
    optionDEn: 'Laxmibai',
    explanationEn: 'Mangal Pandey initiated the revolt.',
    correctOption: 'A',
    ...overrides,
  };
}

function makeValidResult(count = 3): AIGenerationResult {
  return {
    titleHi: 'Test Hindi Title',
    titleEn: 'Test English Title',
    questions: Array.from({ length: count }, (_, i) => makeQuestion({ order: i + 1 })),
  };
}

describe('validateAIOutput', () => {
  it('passes a valid result', () => {
    const result = validateAIOutput(makeValidResult(5), 5);
    expect(result.valid).toBe(true);
  });

  it('fails when result is not an object', () => {
    const result = validateAIOutput(null, 5);
    expect(result.valid).toBe(false);
  });

  it('fails when titleHi is missing', () => {
    const data = { ...makeValidResult(3), titleHi: '' };
    const result = validateAIOutput(data, 3);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'titleHi')).toBe(true);
  });

  it('fails when titleEn is missing', () => {
    const data = { ...makeValidResult(3), titleEn: '   ' };
    const result = validateAIOutput(data, 3);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'titleEn')).toBe(true);
  });

  it('fails when question count does not match expected', () => {
    const result = validateAIOutput(makeValidResult(3), 5);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'questions.length')).toBe(true);
  });

  it('fails when correctOption is E', () => {
    const data = makeValidResult(1);
    data.questions[0] = makeQuestion({ order: 1, correctOption: 'E' });
    const result = validateAIOutput(data, 1);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.field.includes('correctOption'))).toBe(true);
    }
  });

  it('fails when correctOption is invalid (F, X, etc.)', () => {
    const data = makeValidResult(1);
    data.questions[0] = makeQuestion({ order: 1, correctOption: 'X' });
    const result = validateAIOutput(data, 1);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.field.includes('correctOption'))).toBe(true);
    }
  });

  it('accepts correctOption A, B, C, D', () => {
    for (const opt of ['A', 'B', 'C', 'D']) {
      const data = makeValidResult(1);
      data.questions[0] = makeQuestion({ order: 1, correctOption: opt });
      const result = validateAIOutput(data, 1);
      expect(result.valid).toBe(true);
    }
  });

  it('fails when questionHi is empty', () => {
    const data = makeValidResult(1);
    data.questions[0] = makeQuestion({ order: 1, questionHi: '' });
    const result = validateAIOutput(data, 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field.includes('questionHi'))).toBe(true);
  });

  it('fails when questionEn is missing', () => {
    const data = makeValidResult(1);
    data.questions[0] = makeQuestion({ order: 1, questionEn: '   ' });
    const result = validateAIOutput(data, 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field.includes('questionEn'))).toBe(true);
  });

  it('fails when explanationHi is missing', () => {
    const data = makeValidResult(1);
    data.questions[0] = makeQuestion({ order: 1, explanationHi: '' });
    const result = validateAIOutput(data, 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field.includes('explanationHi'))).toBe(true);
  });

  it('fails when explanationEn is missing', () => {
    const data = makeValidResult(1);
    data.questions[0] = makeQuestion({ order: 1, explanationEn: '' });
    const result = validateAIOutput(data, 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field.includes('explanationEn'))).toBe(true);
  });

  it('fails when an option text is empty', () => {
    const data = makeValidResult(1);
    data.questions[0] = makeQuestion({ order: 1, optionAHi: '' });
    const result = validateAIOutput(data, 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field.includes('optionAHi'))).toBe(true);
  });

  it('fails when duplicate order numbers exist', () => {
    const data = makeValidResult(3);
    data.questions[1] = makeQuestion({ order: 1 }); // same order as first
    const result = validateAIOutput(data, 3);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.message.includes('Duplicate order'))).toBe(true);
  });

  it('fails when questions is not an array', () => {
    const data = { titleHi: 'Hi', titleEn: 'En', questions: 'not-array' };
    const result = validateAIOutput(data, 5);
    expect(result.valid).toBe(false);
  });

  it('reports multiple errors in one pass', () => {
    const data = makeValidResult(1);
    data.questions[0] = makeQuestion({ order: 1, questionHi: '', explanationEn: '', correctOption: 'E' });
    const result = validateAIOutput(data, 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.length).toBeGreaterThan(1);
  });
});
