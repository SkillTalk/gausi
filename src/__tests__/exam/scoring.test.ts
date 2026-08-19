import { describe, it, expect } from 'vitest';
import { calculateResult, formatTime, formatTimeHuman } from '@/lib/exam/scoring';
import type { ExamTest, ExamSession } from '@/types/exam';

const mockTest: ExamTest = {
  id: 'test-scoring',
  slug: 'test-scoring',
  date: '2026-08-19',
  title: 'Test',
  titleHi: 'टेस्ट',
  subject: 'History',
  subjectHi: 'इतिहास',
  topicId: 'test',
  difficulty: 'Beginner',
  config: {
    examId: 'test',
    examName: 'Test',
    totalQuestions: 4,
    durationMinutes: 10,
    marks: { correct: 1, wrong: -0.25, optionE: 0, unanswered: -0.25 },
  },
  questions: [
    {
      id: 'q1',
      category: 'CatA',
      correctOption: 'A',
      hi: { question: 'Q1?', options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
      en: { question: 'Q1?', options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
    },
    {
      id: 'q2',
      category: 'CatA',
      correctOption: 'B',
      hi: { question: 'Q2?', options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
      en: { question: 'Q2?', options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
    },
    {
      id: 'q3',
      category: 'CatB',
      correctOption: 'C',
      hi: { question: 'Q3?', options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
      en: { question: 'Q3?', options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
    },
    {
      id: 'q4',
      category: 'CatB',
      correctOption: 'D',
      hi: { question: 'Q4?', options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
      en: { question: 'Q4?', options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
    },
  ],
};

function makeSession(answers: Record<string, string>, reviews: Record<string, boolean> = {}): ExamSession {
  return {
    sessionId: 'test-session',
    testId: 'test-scoring',
    startedAt: Date.now() - 300_000,
    expiresAt: Date.now() + 300_000,
    language: 'en',
    currentQuestion: 0,
    answers: answers as ExamSession['answers'],
    markedForReview: reviews,
    visited: {},
    submitted: true,
    submittedAt: Date.now(),
  };
}

describe('calculateResult', () => {
  it('scores all correct answers', () => {
    const session = makeSession({ q1: 'A', q2: 'B', q3: 'C', q4: 'D' });
    const result = calculateResult(mockTest, session);
    expect(result.correct).toBe(4);
    expect(result.wrong).toBe(0);
    expect(result.score).toBe(4);
    expect(result.maxScore).toBe(4);
    expect(result.accuracy).toBe(100);
  });

  it('applies negative marking for wrong answers', () => {
    const session = makeSession({ q1: 'B', q2: 'A', q3: 'A', q4: 'A' });
    const result = calculateResult(mockTest, session);
    expect(result.wrong).toBe(4);
    expect(result.score).toBe(-1);
  });

  it('gives 0 marks for option E', () => {
    const session = makeSession({ q1: 'E', q2: 'E' });
    const result = calculateResult(mockTest, session);
    expect(result.optionE).toBe(2);
    // q3, q4 unanswered = -0.25 each = -0.5
    expect(result.score).toBe(-0.5);
  });

  it('applies unanswered penalty', () => {
    const session = makeSession({});
    const result = calculateResult(mockTest, session);
    expect(result.unanswered).toBe(4);
    expect(result.score).toBe(-1);
  });

  it('handles mixed scenario correctly', () => {
    // q1 correct(+1), q2 wrong(-0.25), q3 optionE(0), q4 unanswered(-0.25)
    const session = makeSession({ q1: 'A', q2: 'A', q3: 'E' });
    const result = calculateResult(mockTest, session);
    expect(result.correct).toBe(1);
    expect(result.wrong).toBe(1);
    expect(result.optionE).toBe(1);
    expect(result.unanswered).toBe(1);
    expect(result.score).toBe(0.5);
    expect(result.attempted).toBe(3);
    // accuracy = correct / attempted = 1/3 = 33.3%
    expect(result.accuracy).toBe(33.3);
  });

  it('calculates category results correctly', () => {
    const session = makeSession({ q1: 'A', q2: 'B', q3: 'A', q4: 'D' });
    const result = calculateResult(mockTest, session);
    const catA = result.categoryResults.find((c) => c.category === 'CatA');
    const catB = result.categoryResults.find((c) => c.category === 'CatB');
    expect(catA?.correct).toBe(2);
    expect(catA?.wrong).toBe(0);
    expect(catB?.correct).toBe(1);
    expect(catB?.wrong).toBe(1);
  });

  it('rounds score to 2 decimal places', () => {
    // 3 wrong = -0.75, 1 correct = +1 → 0.25
    const session = makeSession({ q1: 'A', q2: 'A', q3: 'A', q4: 'A' });
    const result = calculateResult(mockTest, session);
    expect(result.score).toBe(0.25);
    expect(Number.isFinite(result.score)).toBe(true);
    const str = result.score.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

describe('formatTime', () => {
  it('formats zero ms as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats 90 seconds as 01:30', () => {
    expect(formatTime(90_000)).toBe('01:30');
  });

  it('formats 15 minutes as 15:00', () => {
    expect(formatTime(15 * 60_000)).toBe('15:00');
  });

  it('clamps negative values to 00:00', () => {
    expect(formatTime(-5000)).toBe('00:00');
  });
});

describe('formatTimeHuman', () => {
  it('returns seconds-only when under a minute', () => {
    expect(formatTimeHuman(45_000)).toBe('45 sec');
  });

  it('returns minutes-only when exactly on minute', () => {
    expect(formatTimeHuman(2 * 60_000)).toBe('2 min');
  });

  it('returns both when mix', () => {
    expect(formatTimeHuman(2 * 60_000 + 30_000)).toBe('2 min 30 sec');
  });
});
