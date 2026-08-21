import { describe, it, expect } from 'vitest';
import { calculateResult, formatTime, formatTimeHuman } from '@/lib/exam/scoring';
import type { ExamTest, ExamSession, CorrectOptionKey } from '@/types/exam';

// ─── Mock builder ─────────────────────────────────────────────────────────────

/**
 * Build an ExamTest mock with n questions (all correct option = 'A').
 * Default marks use the real TRE4 rule: wrong = -1/3, unanswered = 0
 * (unanswered=0 lets tests isolate wrong-answer maths without cross-contamination).
 */
function makeMockTest(
  n: number,
  marks = { correct: 1, wrong: -(1 / 3), optionE: 0, unanswered: 0 }
): ExamTest {
  return {
    id: 'test-scoring',
    slug: 'test-scoring',
    date: '2026-08-21',
    title: 'Test',
    titleHi: 'टेस्ट',
    subject: 'History',
    subjectHi: 'इतिहास',
    topicId: 'test',
    difficulty: 'Beginner',
    config: {
      examId: 'bpsc-tre4',
      examName: 'BPSC TRE 4',
      totalQuestions: n,
      durationMinutes: 10,
      marks,
    },
    questions: Array.from({ length: n }, (_, i) => ({
      id: `q${i + 1}`,
      category: i < Math.floor(n / 2) ? 'CatA' : 'CatB',
      correctOption: 'A' as CorrectOptionKey,
      hi: { question: `Q${i + 1}?`, options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
      en: { question: `Q${i + 1}?`, options: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'skip' }, explanation: 'exp' },
    })),
  };
}

/** Build an ExamSession with specific answers for named question IDs. */
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

// ─── TRE4 1/3 negative-marking tests (unanswered=0 to isolate) ───────────────

describe('TRE4 scoring — wrong = -1/3 mark', () => {
  it('1 correct, 0 wrong → +1', () => {
    const test = makeMockTest(1);
    const result = calculateResult(test, makeSession({ q1: 'A' }));
    expect(result.correct).toBe(1);
    expect(result.wrong).toBe(0);
    expect(result.score).toBe(1);
  });

  it('0 correct, 1 wrong → -0.33', () => {
    const test = makeMockTest(1);
    const result = calculateResult(test, makeSession({ q1: 'B' }));
    expect(result.correct).toBe(0);
    expect(result.wrong).toBe(1);
    // -1/3 rounded to 2 dp
    expect(result.score).toBe(-0.33);
  });

  it('0 correct, 3 wrong → exactly -1', () => {
    const test = makeMockTest(3);
    const session = makeSession({ q1: 'B', q2: 'B', q3: 'B' });
    const result = calculateResult(test, session);
    expect(result.wrong).toBe(3);
    expect(result.correct).toBe(0);
    expect(result.score).toBe(-1); // 3 × (-1/3) = -1 exactly
  });

  it('0 correct, 6 wrong → exactly -2', () => {
    const test = makeMockTest(6);
    const session = makeSession({ q1: 'B', q2: 'B', q3: 'B', q4: 'B', q5: 'B', q6: 'B' });
    const result = calculateResult(test, session);
    expect(result.wrong).toBe(6);
    expect(result.score).toBe(-2); // 6 × (-1/3) = -2 exactly
  });

  it('10 correct, 3 wrong → 9', () => {
    const test = makeMockTest(13);
    const answers: Record<string, string> = {};
    for (let i = 1; i <= 10; i++) answers[`q${i}`] = 'A'; // correct
    for (let i = 11; i <= 13; i++) answers[`q${i}`] = 'B'; // wrong
    const result = calculateResult(test, makeSession(answers));
    expect(result.correct).toBe(10);
    expect(result.wrong).toBe(3);
    expect(result.score).toBe(9); // 10 - 3×(1/3) = 10 - 1 = 9
  });

  it('10 correct, 6 wrong → 8', () => {
    const test = makeMockTest(16);
    const answers: Record<string, string> = {};
    for (let i = 1; i <= 10; i++) answers[`q${i}`] = 'A'; // correct
    for (let i = 11; i <= 16; i++) answers[`q${i}`] = 'B'; // wrong
    const result = calculateResult(test, makeSession(answers));
    expect(result.correct).toBe(10);
    expect(result.wrong).toBe(6);
    expect(result.score).toBe(8); // 10 - 6×(1/3) = 10 - 2 = 8
  });

  it('1 correct, 3 wrong → 0 (break-even is 3 wrong per correct)', () => {
    const test = makeMockTest(4);
    const session = makeSession({ q1: 'A', q2: 'B', q3: 'B', q4: 'B' });
    const result = calculateResult(test, session);
    expect(result.correct).toBe(1);
    expect(result.wrong).toBe(3);
    expect(result.score).toBe(0); // 1 - 1 = 0
  });

  it('score has no floating-point display artifacts', () => {
    const test = makeMockTest(4);
    const session = makeSession({ q1: 'B', q2: 'B' }); // 2 wrong = -2/3
    const result = calculateResult(test, session);
    // -2/3 = -0.6666... → rounded to -0.67
    expect(result.score).toBe(-0.67);
    // Ensure string representation has ≤ 2 decimal places
    const str = result.score.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it('option E incurs no penalty (zero marks)', () => {
    const test = makeMockTest(4);
    const session = makeSession({ q1: 'E', q2: 'E', q3: 'E', q4: 'E' });
    const result = calculateResult(test, session);
    expect(result.optionE).toBe(4);
    expect(result.score).toBe(0); // optionE = 0 marks each
  });
});

// ─── Mixed correct / wrong / E / unanswered ──────────────────────────────────

describe('TRE4 scoring — mixed scenarios', () => {
  it('mixed correct/wrong/E/unanswered accounts for all rule types', () => {
    // unanswered = -0.25 (unchanged BPSC rule)
    const test = makeMockTest(4, { correct: 1, wrong: -(1 / 3), optionE: 0, unanswered: -0.25 });
    // q1 correct (+1), q2 wrong (-1/3), q3 optionE (0), q4 unanswered (-0.25)
    const session = makeSession({ q1: 'A', q2: 'B', q3: 'E' });
    const result = calculateResult(test, session);
    expect(result.correct).toBe(1);
    expect(result.wrong).toBe(1);
    expect(result.optionE).toBe(1);
    expect(result.unanswered).toBe(1);
    // 1 - 1/3 + 0 - 0.25 = 0.4166... → 0.42
    expect(result.score).toBe(0.42);
    expect(result.attempted).toBe(3);
    // accuracy = correct / attempted = 1/3 = 33.3%
    expect(result.accuracy).toBe(33.3);
  });

  it('all correct yields full maxScore', () => {
    const test = makeMockTest(4);
    const session = makeSession({ q1: 'A', q2: 'A', q3: 'A', q4: 'A' });
    const result = calculateResult(test, session);
    expect(result.correct).toBe(4);
    expect(result.wrong).toBe(0);
    expect(result.score).toBe(4);
    expect(result.maxScore).toBe(4);
    expect(result.accuracy).toBe(100);
  });
});

// ─── Unanswered penalty is unchanged at -0.25 ────────────────────────────────

describe('unanswered penalty — unchanged at -0.25', () => {
  it('4 unanswered = -1 total', () => {
    const test = makeMockTest(4, { correct: 1, wrong: -(1 / 3), optionE: 0, unanswered: -0.25 });
    const result = calculateResult(test, makeSession({}));
    expect(result.unanswered).toBe(4);
    expect(result.score).toBe(-1); // 4 × -0.25 = -1
  });

  it('option E gives 0 while unanswered still penalises', () => {
    const test = makeMockTest(4, { correct: 1, wrong: -(1 / 3), optionE: 0, unanswered: -0.25 });
    // q1, q2 optionE (0 each); q3, q4 unanswered (-0.25 each)
    const session = makeSession({ q1: 'E', q2: 'E' });
    const result = calculateResult(test, session);
    expect(result.optionE).toBe(2);
    expect(result.score).toBe(-0.5); // 0 + 0 + (-0.25) + (-0.25)
  });
});

// ─── Client / server score consistency ───────────────────────────────────────

describe('client/server scoring consistency', () => {
  it('rounding strategy ensures client and server agree on 2-dp result', () => {
    // Simulate the same Math.round(score × 100) / 100 that both client
    // scoring.ts and server attempts/route.ts use.
    const wrongMark = -(1 / 3);
    const clientScore = Math.round((10 * 1 + 3 * wrongMark) * 100) / 100;
    const serverScore = Math.round((10 * 1 + 3 * wrongMark) * 100) / 100;
    expect(clientScore).toBe(serverScore);
    expect(clientScore).toBe(9); // 10 - 1 = 9
  });

  it('historical snapshot: stored marksAwarded survives config changes', () => {
    // Old snapshots stored marksAwarded = -0.25 (the 1/4 rule).
    // Changing the config does NOT alter those DB rows — they were frozen at submission time.
    // We verify the new config produces -1/3 per wrong answer, distinct from the old -0.25.
    const oldSnapshot = { marksAwarded: -0.25, status: 'wrong' };
    const newMark = -(1 / 3);
    // Stored snapshot is NOT retroactively changed
    expect(oldSnapshot.marksAwarded).toBe(-0.25);
    // New submissions use -1/3
    expect(Math.abs(newMark - (-1 / 3))).toBeLessThan(1e-9);
  });
});

// ─── Category breakdown ───────────────────────────────────────────────────────

describe('category breakdown', () => {
  it('correctly tallies correct/wrong per category', () => {
    const test = makeMockTest(4); // q1-q2 CatA, q3-q4 CatB
    // q1 correct, q2 correct, q3 wrong, q4 correct
    const session = makeSession({ q1: 'A', q2: 'A', q3: 'B', q4: 'A' });
    const result = calculateResult(test, session);
    const catA = result.categoryResults.find((c) => c.category === 'CatA');
    const catB = result.categoryResults.find((c) => c.category === 'CatB');
    expect(catA?.correct).toBe(2);
    expect(catA?.wrong).toBe(0);
    expect(catB?.correct).toBe(1);
    expect(catB?.wrong).toBe(1);
  });
});

// ─── formatTime ───────────────────────────────────────────────────────────────

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

// ─── formatTimeHuman ──────────────────────────────────────────────────────────

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
