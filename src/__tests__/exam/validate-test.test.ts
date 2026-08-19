import { describe, it, expect } from 'vitest';
import { validateTest, assertTestValid } from '@/lib/exam/validate-test';
import test1857 from '@/content/exams/tre4/tests/2026-08-19-1857';

describe('validateTest — 1857 test data', () => {
  it('passes validation with zero errors', () => {
    const errors = validateTest(test1857);
    expect(errors).toEqual([]);
  });

  it('has exactly 25 questions', () => {
    expect(test1857.questions.length).toBe(25);
  });

  it('all question IDs are unique', () => {
    const ids = test1857.questions.map((q) => q.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all correctOptions are A/B/C/D', () => {
    for (const q of test1857.questions) {
      expect(['A', 'B', 'C', 'D']).toContain(q.correctOption);
    }
  });

  it('all questions have Hindi and English text', () => {
    for (const q of test1857.questions) {
      expect(q.hi.question.trim().length).toBeGreaterThan(0);
      expect(q.en.question.trim().length).toBeGreaterThan(0);
    }
  });

  it('all questions have A–E options in both languages', () => {
    for (const q of test1857.questions) {
      for (const opt of ['A', 'B', 'C', 'D', 'E'] as const) {
        expect(q.hi.options[opt].trim().length).toBeGreaterThan(0);
        expect(q.en.options[opt].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('all questions have explanations in both languages', () => {
    for (const q of test1857.questions) {
      expect(q.hi.explanation.trim().length).toBeGreaterThan(0);
      expect(q.en.explanation.trim().length).toBeGreaterThan(0);
    }
  });

  it('assertTestValid does not throw', () => {
    expect(() => assertTestValid(test1857)).not.toThrow();
  });
});

describe('validateTest — bad data detection', () => {
  it('catches wrong question count', () => {
    const bad = { ...test1857, questions: test1857.questions.slice(0, 10) };
    const errors = validateTest(bad);
    expect(errors.some((e) => e.includes('Expected 25'))).toBe(true);
  });

  it('catches duplicate question IDs', () => {
    const q = test1857.questions[0];
    const bad = { ...test1857, questions: [q, q, ...test1857.questions.slice(2)] };
    const errors = validateTest(bad);
    expect(errors.some((e) => e.includes('Duplicate'))).toBe(true);
  });

  it('catches invalid correctOption', () => {
    const questions = [...test1857.questions];
    questions[0] = { ...questions[0], correctOption: 'E' as never };
    const bad = { ...test1857, questions };
    const errors = validateTest(bad);
    expect(errors.some((e) => e.includes('correctOption'))).toBe(true);
  });
});
