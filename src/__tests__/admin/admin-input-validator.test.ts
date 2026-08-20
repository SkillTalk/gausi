import { describe, it, expect } from 'vitest';
import { validateGenerateInput } from '@/lib/admin/admin-validator';

function validInput() {
  return {
    exam: 'BPSC TRE 4',
    category: 'History',
    topic: 'Revolt of 1857',
    difficulty: 'Beginner',
    totalQuestions: 25,
    durationMinutes: 15,
  };
}

describe('validateGenerateInput', () => {
  it('passes a valid input', () => {
    const result = validateGenerateInput(validInput());
    expect(result.valid).toBe(true);
  });

  it('passes with optional plannedPublishAt as ISO string', () => {
    const result = validateGenerateInput({ ...validInput(), plannedPublishAt: '2026-08-21T00:00:00Z' });
    expect(result.valid).toBe(true);
  });

  it('fails when body is null', () => {
    const result = validateGenerateInput(null);
    expect(result.valid).toBe(false);
  });

  it('fails when exam is unknown', () => {
    const result = validateGenerateInput({ ...validInput(), exam: 'Unknown Exam' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'exam')).toBe(true);
  });

  it('fails when category is missing', () => {
    const result = validateGenerateInput({ ...validInput(), category: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'category')).toBe(true);
  });

  it('fails when category is not in the exam category list', () => {
    const result = validateGenerateInput({ ...validInput(), category: 'InvalidCategory' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'category')).toBe(true);
  });

  it('fails when topic is missing', () => {
    const result = validateGenerateInput({ ...validInput(), topic: '' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'topic')).toBe(true);
  });

  it('fails when topic exceeds 200 characters', () => {
    const result = validateGenerateInput({ ...validInput(), topic: 'x'.repeat(201) });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'topic')).toBe(true);
  });

  it('fails when difficulty is invalid', () => {
    const result = validateGenerateInput({ ...validInput(), difficulty: 'Ultra-Hard' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'difficulty')).toBe(true);
  });

  it('accepts all valid difficulty levels', () => {
    for (const d of ['Beginner', 'Easy', 'Moderate', 'Hard', 'Mixed']) {
      const result = validateGenerateInput({ ...validInput(), difficulty: d });
      expect(result.valid).toBe(true);
    }
  });

  it('fails when totalQuestions is less than 5', () => {
    const result = validateGenerateInput({ ...validInput(), totalQuestions: 4 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'totalQuestions')).toBe(true);
  });

  it('fails when totalQuestions is more than 50', () => {
    const result = validateGenerateInput({ ...validInput(), totalQuestions: 51 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'totalQuestions')).toBe(true);
  });

  it('fails when totalQuestions is not an integer', () => {
    const result = validateGenerateInput({ ...validInput(), totalQuestions: 10.5 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'totalQuestions')).toBe(true);
  });

  it('fails when durationMinutes is less than 5', () => {
    const result = validateGenerateInput({ ...validInput(), durationMinutes: 4 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'durationMinutes')).toBe(true);
  });

  it('fails when plannedPublishAt is not a valid ISO date', () => {
    const result = validateGenerateInput({ ...validInput(), plannedPublishAt: 'not-a-date' });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some(e => e.field === 'plannedPublishAt')).toBe(true);
  });

  it('passes when plannedPublishAt is null (explicit null)', () => {
    const result = validateGenerateInput({ ...validInput(), plannedPublishAt: null });
    expect(result.valid).toBe(true);
  });
});
