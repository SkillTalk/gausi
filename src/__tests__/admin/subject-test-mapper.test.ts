/**
 * Mapper regression tests — subject-test-mapper
 *
 * Verifies that mapAIQuestionToDBRow produces output identical to the old
 * inline mapping that was in generation.service.ts before extraction.
 *
 * The "expected" shapes below are the exact DB row fields that the old
 * inline .map() produced. Any divergence here would indicate a regression
 * in the shared mapper or in the extraction of OPTION_E constants.
 */

import { describe, it, expect } from 'vitest';
import {
  mapAIQuestionToDBRow,
  OPTION_E_HI,
  OPTION_E_EN,
  type MappedQuestionRow,
} from '@/lib/admin/question-mapper';
import type { AIQuestion } from '@/types/generated-test';

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeAIQuestion(overrides: Partial<AIQuestion> = {}): AIQuestion {
  return {
    order: 1,
    category: '  Leaders  ',          // intentional trailing spaces — must be trimmed
    topic: 'Revolt of 1857',
    difficulty: 'Beginner',
    questionType: 'DIRECT',
    questionHi: '1857 का विद्रोह कब शुरू हुआ?',
    optionAHi: '1857',
    optionBHi: '1858',
    optionCHi: '1856',
    optionDHi: '1860',
    explanationHi: 'यह 1857 में शुरू हुआ।',
    questionEn: 'When did the Revolt of 1857 begin?',
    optionAEn: '1857',
    optionBEn: '1858',
    optionCEn: '1856',
    optionDEn: '1860',
    explanationEn: 'It began in 1857.',
    correctOption: 'a',               // intentional lowercase — must be normalised to 'A'
    ...overrides,
  };
}

// ─── Option E constants ───────────────────────────────────────────────────────

describe('OPTION_E constants', () => {
  it('OPTION_E_HI is the expected Hindi text', () => {
    expect(OPTION_E_HI).toBe('उत्तर नहीं देना चाहता');
  });

  it('OPTION_E_EN is the expected English text', () => {
    expect(OPTION_E_EN).toBe('I do not want to answer');
  });
});

// ─── Exact field-by-field regression ─────────────────────────────────────────

describe('mapAIQuestionToDBRow — exact field regression', () => {
  it('produces the same shape as the old inline mapper in generation.service.ts', () => {
    const q = makeAIQuestion();
    const testId = 'test-abc-123';

    const row = mapAIQuestionToDBRow(q, testId);

    // Every field that the old inline mapper set must be present and correct
    const expected: MappedQuestionRow = {
      testId: 'test-abc-123',
      order: 1,
      category: 'Leaders',            // trimmed
      topic: 'Revolt of 1857',
      difficulty: 'Beginner',
      questionType: 'DIRECT',
      questionHi: '1857 का विद्रोह कब शुरू हुआ?',
      optionAHi: '1857',
      optionBHi: '1858',
      optionCHi: '1856',
      optionDHi: '1860',
      optionEHi: OPTION_E_HI,         // hardcoded — never from AI
      explanationHi: 'यह 1857 में शुरू हुआ।',
      questionEn: 'When did the Revolt of 1857 begin?',
      optionAEn: '1857',
      optionBEn: '1858',
      optionCEn: '1856',
      optionDEn: '1860',
      optionEEn: OPTION_E_EN,         // hardcoded — never from AI
      explanationEn: 'It began in 1857.',
      correctOption: 'A',             // normalised uppercase
    };

    expect(row).toEqual(expected);
  });

  it('trims whitespace from all string fields', () => {
    const q = makeAIQuestion({
      category: '  Geography  ',
      topic: '  Himalaya  ',
      difficulty: '  Hard  ',
      questionType: 'STATEMENT' as const, // trimming is tested via the row output
      questionHi: '  कथन  ',
      optionAHi: '  A विकल्प  ',
      optionBHi: '  B विकल्प  ',
      optionCHi: '  C विकल्प  ',
      optionDHi: '  D विकल्प  ',
      explanationHi: '  व्याख्या  ',
      questionEn: '  Statement  ',
      optionAEn: '  A option  ',
      optionBEn: '  B option  ',
      optionCEn: '  C option  ',
      optionDEn: '  D option  ',
      explanationEn: '  Explanation  ',
      correctOption: '  B  ',
    });

    const row = mapAIQuestionToDBRow(q, 'test-xyz');
    expect(row.category).toBe('Geography');
    expect(row.topic).toBe('Himalaya');
    expect(row.difficulty).toBe('Hard');
    expect(row.questionType).toBe('STATEMENT'); // no trimming needed on this field (already clean)
    expect(row.questionHi).toBe('कथन');
    expect(row.optionAHi).toBe('A विकल्प');
    expect(row.explanationEn).toBe('Explanation');
    expect(row.correctOption).toBe('B');
  });
});

// ─── Option E invariants ──────────────────────────────────────────────────────

describe('mapAIQuestionToDBRow — Option E invariants', () => {
  it('optionEHi is always OPTION_E_HI regardless of AI question shape', () => {
    const row = mapAIQuestionToDBRow(makeAIQuestion(), 'test-1');
    expect(row.optionEHi).toBe(OPTION_E_HI);
  });

  it('optionEEn is always OPTION_E_EN regardless of AI question shape', () => {
    const row = mapAIQuestionToDBRow(makeAIQuestion(), 'test-2');
    expect(row.optionEEn).toBe(OPTION_E_EN);
  });

  it('optionEHi is not sourced from any AI field', () => {
    // AIQuestion has no optionEHi field — the mapper must inject it from the constant
    const q = makeAIQuestion();
    // Cast to any to simulate if AI ever smuggles an 'optionEHi' key
    (q as Record<string, unknown>)['optionEHi'] = 'हैक करने का प्रयास';
    const row = mapAIQuestionToDBRow(q, 'test-3');
    // Must still be the constant — AI value silently ignored
    expect(row.optionEHi).toBe(OPTION_E_HI);
  });
});

// ─── correctOption normalisation ─────────────────────────────────────────────

describe('mapAIQuestionToDBRow — correctOption normalisation', () => {
  it.each([
    ['a', 'A'],
    ['b', 'B'],
    ['c', 'C'],
    ['d', 'D'],
    ['A', 'A'],
    ['B', 'B'],
    [' c ', 'C'],
  ])('normalises "%s" → "%s"', (input, expected) => {
    const row = mapAIQuestionToDBRow(makeAIQuestion({ correctOption: input }), 'test');
    expect(row.correctOption).toBe(expected);
  });

  it('never produces correctOption "E"', () => {
    // validateAIOutput ensures this before mapping, but mapper must not introduce it
    const row = mapAIQuestionToDBRow(makeAIQuestion({ correctOption: 'A' }), 'test');
    expect(row.correctOption).not.toBe('E');
  });
});

// ─── overrideOrder ───────────────────────────────────────────────────────────

describe('mapAIQuestionToDBRow — overrideOrder', () => {
  it('uses q.order when overrideOrder is not supplied', () => {
    const row = mapAIQuestionToDBRow(makeAIQuestion({ order: 7 }), 'test');
    expect(row.order).toBe(7);
  });

  it('uses overrideOrder when supplied, ignoring q.order', () => {
    const row = mapAIQuestionToDBRow(makeAIQuestion({ order: 1 }), 'test', 42);
    expect(row.order).toBe(42);
  });

  it('batch offset simulation: orders 1-20 → 21-40', () => {
    // Simulate batch 2: batchOffset = 20, localIdx 0-19 → override = 21-40
    const rows = Array.from({ length: 20 }, (_, i) =>
      mapAIQuestionToDBRow(makeAIQuestion({ order: i + 1 }), 'test', 20 + i + 1),
    );
    const orders = rows.map((r) => r.order);
    expect(orders).toEqual(Array.from({ length: 20 }, (_, i) => i + 21));
  });
});

// ─── questionType fallback ────────────────────────────────────────────────────

describe('mapAIQuestionToDBRow — questionType fallback', () => {
  it('defaults to "DIRECT" when questionType is undefined', () => {
    const q = makeAIQuestion();
    delete q.questionType;
    const row = mapAIQuestionToDBRow(q, 'test');
    expect(row.questionType).toBe('DIRECT');
  });

  it('preserves explicit questionType values', () => {
    for (const qt of ['DIRECT', 'STATEMENT', 'CHRONOLOGY', 'MATCHING', 'ASSERTION_REASON'] as const) {
      const row = mapAIQuestionToDBRow(makeAIQuestion({ questionType: qt }), 'test');
      expect(row.questionType).toBe(qt);
    }
  });
});

// ─── testId ──────────────────────────────────────────────────────────────────

describe('mapAIQuestionToDBRow — testId', () => {
  it('passes testId through exactly', () => {
    const row = mapAIQuestionToDBRow(makeAIQuestion(), 'specific-test-id-xyz');
    expect(row.testId).toBe('specific-test-id-xyz');
  });
});
