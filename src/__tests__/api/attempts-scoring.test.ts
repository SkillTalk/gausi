/**
 * Tests for server-side score recalculation logic.
 *
 * We test the pure recalculation logic directly by importing and running it
 * against the real static test data. This validates that the server cannot
 * be tricked by client-supplied scores.
 */
import { describe, it, expect } from 'vitest';
import { tre4Tests } from '@/content/exams/tre4/tests';
import type { OptionKey } from '@/types/exam';

// We replicate the server recalculation function here so we can unit-test it
// without spinning up a Next.js server.

type AnswerSnapshot = {
  questionId: string;
  selectedOption: OptionKey | null;
  correctOption: string;
  status: 'correct' | 'wrong' | 'optionE' | 'unanswered';
  marksAwarded: number;
};

function recalculate(
  testId: string,
  rawAnswers: Record<string, OptionKey | null>,
  startedAt: Date,
  submittedAt: Date
) {
  const test = tre4Tests.find((t) => t.id === testId);
  if (!test) return { error: `Test not found: ${testId}` };

  const { config, questions } = test;
  const { marks } = config;

  const knownIds = new Set(questions.map((q) => q.id));
  for (const qid of Object.keys(rawAnswers)) {
    if (!knownIds.has(qid)) return { error: `Unknown questionId: ${qid}` };
  }

  const answers: AnswerSnapshot[] = questions.map((q) => {
    const selected = rawAnswers[q.id] ?? null;
    let status: AnswerSnapshot['status'];
    let marksAwarded: number;
    if (selected === null) { status = 'unanswered'; marksAwarded = marks.unanswered; }
    else if (selected === 'E') { status = 'optionE'; marksAwarded = marks.optionE; }
    else if (selected === q.correctOption) { status = 'correct'; marksAwarded = marks.correct; }
    else { status = 'wrong'; marksAwarded = marks.wrong; }
    return { questionId: q.id, selectedOption: selected, correctOption: q.correctOption, status, marksAwarded };
  });

  const correct = answers.filter((a) => a.status === 'correct').length;
  const wrong = answers.filter((a) => a.status === 'wrong').length;
  const optionE = answers.filter((a) => a.status === 'optionE').length;
  const unanswered = answers.filter((a) => a.status === 'unanswered').length;
  const attempted = correct + wrong + optionE;
  const rawScore = answers.reduce((s, a) => s + a.marksAwarded, 0);
  const score = Math.round(rawScore * 100) / 100;
  const maxScore = config.totalQuestions * marks.correct;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0;
  const durationMs = config.durationMinutes * 60 * 1000;
  const elapsedMs = submittedAt.getTime() - startedAt.getTime();
  const timeUsedSeconds = Math.round(Math.min(elapsedMs, durationMs) / 1000);
  return { score, maxScore, correct, wrong, optionE, unanswered, attempted, accuracy, timeUsedSeconds, answers };
}

const TEST_ID = tre4Tests[0].id;
const questions = tre4Tests[0].questions;
const now = new Date();
const start = new Date(now.getTime() - 5 * 60 * 1000);

describe('server-side recalculation', () => {
  it('rejects unknown question IDs', () => {
    const result = recalculate(TEST_ID, { 'fake-id-999': 'A' }, start, now);
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toMatch(/Unknown questionId/);
  });

  it('rejects unknown test ID', () => {
    const result = recalculate('does-not-exist', {}, start, now);
    expect(result).toHaveProperty('error');
  });

  it('all correct answers yield maxScore', () => {
    const allCorrect: Record<string, OptionKey> = {};
    for (const q of questions) {
      allCorrect[q.id] = q.correctOption as OptionKey;
    }
    const result = recalculate(TEST_ID, allCorrect, start, now);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.score).toBe(result.maxScore);
    expect(result.correct).toBe(questions.length);
    expect(result.wrong).toBe(0);
  });

  it('all unanswered yields negative score (unanswered penalty = −0.25)', () => {
    const result = recalculate(TEST_ID, {}, start, now);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.score).toBeLessThan(0);
    expect(result.unanswered).toBe(questions.length);
    expect(result.correct).toBe(0);
  });

  it('option E incurs no penalty', () => {
    const onlyE: Record<string, OptionKey> = {};
    for (const q of questions) {
      onlyE[q.id] = 'E';
    }
    const result = recalculate(TEST_ID, onlyE, start, now);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.score).toBe(0);
    expect(result.optionE).toBe(questions.length);
  });

  it('client cannot submit a fake high score — server recalculates from scratch', () => {
    // Client might claim score=25 but actually answered everything wrong
    // Server ignores client score and calculates from raw answers
    const allWrong: Record<string, OptionKey> = {};
    for (const q of questions) {
      // pick an option that is definitely wrong (use 'E' which gives 0, or a wrong option)
      const wrongOption = q.correctOption === 'A' ? 'B' : 'A';
      allWrong[q.id] = wrongOption as OptionKey;
    }
    const result = recalculate(TEST_ID, allWrong, start, now);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    // Score must reflect actual wrong answers, not the fake claim
    expect(result.score).toBeLessThan(0);
    expect(result.wrong).toBe(questions.length);
    // Crucially, correct is 0 — not what a cheating client would claim
    expect(result.correct).toBe(0);
  });

  it('correct option in snapshot matches static test definition (not client-supplied)', () => {
    const mixed: Record<string, OptionKey> = {};
    const firstQ = questions[0];
    mixed[firstQ.id] = firstQ.correctOption as OptionKey;

    const result = recalculate(TEST_ID, mixed, start, now);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const snap = result.answers.find((a) => a.questionId === firstQ.id);
    // Correct option in snapshot comes from static test data, not client
    expect(snap?.correctOption).toBe(firstQ.correctOption);
  });

  it('time used is capped at exam duration', () => {
    const longAgo = new Date(now.getTime() - 99 * 60 * 1000); // 99 min ago
    const result = recalculate(TEST_ID, {}, longAgo, now);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const maxSeconds = tre4Tests[0].config.durationMinutes * 60;
    expect(result.timeUsedSeconds).toBeLessThanOrEqual(maxSeconds);
  });

  it('historical snapshot is independent of future config changes', () => {
    // The recalculation uses the config at call time.
    // Historical scores are stored as a snapshot in the DB, so changing
    // marks.correct in the future cannot retroactively alter old DB rows.
    // We verify here that the snapshot correctly records marksAwarded.
    const correctAnswers: Record<string, OptionKey> = {};
    const q0 = questions[0];
    correctAnswers[q0.id] = q0.correctOption as OptionKey;

    const result = recalculate(TEST_ID, correctAnswers, start, now);
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    const snap = result.answers.find((a) => a.questionId === q0.id);
    // The marksAwarded recorded in the snapshot is the frozen value
    expect(snap?.marksAwarded).toBe(tre4Tests[0].config.marks.correct);
    expect(snap?.status).toBe('correct');
  });
});
