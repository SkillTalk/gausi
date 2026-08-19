import { describe, it, expect } from 'vitest';
import {
  createSession,
  setAnswer,
  clearAnswer,
  toggleMarkForReview,
  markVisited,
  setLanguage,
  submitSession,
  getQuestionStatus,
} from '@/lib/exam/session';

describe('createSession', () => {
  it('creates a session with correct shape', () => {
    const s = createSession('test-1', 15, 'hi');
    expect(s.testId).toBe('test-1');
    expect(s.language).toBe('hi');
    expect(s.submitted).toBe(false);
    expect(s.currentQuestion).toBe(0);
    expect(s.answers).toEqual({});
    expect(s.markedForReview).toEqual({});
    expect(s.visited).toEqual({});
    expect(s.expiresAt).toBeGreaterThan(s.startedAt);
    // Duration should be approximately 15 minutes
    expect(s.expiresAt - s.startedAt).toBe(15 * 60 * 1000);
  });

  it('generates a unique sessionId each time', () => {
    const a = createSession('test-1', 15, 'en');
    const b = createSession('test-1', 15, 'en');
    expect(a.sessionId).not.toBe(b.sessionId);
  });
});

describe('setAnswer', () => {
  it('records the answer and marks as visited', () => {
    const s = createSession('t', 15, 'en');
    const updated = setAnswer(s, 'q1', 'B');
    expect(updated.answers['q1']).toBe('B');
    expect(updated.visited['q1']).toBe(true);
  });

  it('does not mutate the original session', () => {
    const s = createSession('t', 15, 'en');
    setAnswer(s, 'q1', 'B');
    expect(s.answers['q1']).toBeUndefined();
  });

  it('overwrites a previous answer', () => {
    const s = createSession('t', 15, 'en');
    const s1 = setAnswer(s, 'q1', 'A');
    const s2 = setAnswer(s1, 'q1', 'C');
    expect(s2.answers['q1']).toBe('C');
  });
});

describe('clearAnswer', () => {
  it('removes the answer', () => {
    const s = setAnswer(createSession('t', 15, 'en'), 'q1', 'A');
    const cleared = clearAnswer(s, 'q1');
    expect(cleared.answers['q1']).toBeUndefined();
  });
});

describe('toggleMarkForReview', () => {
  it('marks unreviewed question for review', () => {
    const s = createSession('t', 15, 'en');
    const toggled = toggleMarkForReview(s, 'q1');
    expect(toggled.markedForReview['q1']).toBe(true);
  });

  it('unmarks already-marked question', () => {
    const s = toggleMarkForReview(createSession('t', 15, 'en'), 'q1');
    const toggled = toggleMarkForReview(s, 'q1');
    expect(toggled.markedForReview['q1']).toBe(false);
  });
});

describe('setLanguage', () => {
  it('changes language without affecting answers', () => {
    const s = setAnswer(createSession('t', 15, 'en'), 'q1', 'A');
    const updated = setLanguage(s, 'hi');
    expect(updated.language).toBe('hi');
    expect(updated.answers['q1']).toBe('A');
  });
});

describe('submitSession', () => {
  it('marks session as submitted', () => {
    const s = createSession('t', 15, 'en');
    const submitted = submitSession(s);
    expect(submitted.submitted).toBe(true);
    expect(submitted.submittedAt).toBeDefined();
  });
});

describe('getQuestionStatus', () => {
  it('returns not-visited for fresh session', () => {
    const s = createSession('t', 15, 'en');
    expect(getQuestionStatus(s, 'q1')).toBe('not-visited');
  });

  it('returns not-answered for visited but unanswered', () => {
    const s = markVisited(createSession('t', 15, 'en'), 'q1');
    expect(getQuestionStatus(s, 'q1')).toBe('not-answered');
  });

  it('returns answered for answered question', () => {
    const s = setAnswer(createSession('t', 15, 'en'), 'q1', 'A');
    expect(getQuestionStatus(s, 'q1')).toBe('answered');
  });

  it('returns option-e for option E selection', () => {
    const s = setAnswer(createSession('t', 15, 'en'), 'q1', 'E');
    expect(getQuestionStatus(s, 'q1')).toBe('option-e');
  });

  it('returns marked-for-review when marked but not answered', () => {
    const s = toggleMarkForReview(markVisited(createSession('t', 15, 'en'), 'q1'), 'q1');
    expect(getQuestionStatus(s, 'q1')).toBe('marked-for-review');
  });

  it('returns answered-marked-for-review when both', () => {
    const s = toggleMarkForReview(setAnswer(createSession('t', 15, 'en'), 'q1', 'B'), 'q1');
    expect(getQuestionStatus(s, 'q1')).toBe('answered-marked-for-review');
  });
});
