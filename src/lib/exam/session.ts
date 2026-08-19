/**
 * Exam session management via localStorage.
 *
 * Session shape: ExamSession (see src/types/exam.ts)
 *
 * Key: `exam-session-${testId}`
 *
 * Only one active session per test is stored. Once submitted, the session
 * is kept (as read-only record) so the result page can reconstruct data.
 */

import type { ExamSession, Lang, OptionKey } from '@/types/exam';
import { computeExpiresAt } from './timer';

const SESSION_PREFIX = 'exam-session-';

function sessionKey(testId: string): string {
  return `${SESSION_PREFIX}${testId}`;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Read / Write ─────────────────────────────────────────────────────────────

export function loadSession(testId: string): ExamSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(sessionKey(testId));
    if (!raw) return null;
    return JSON.parse(raw) as ExamSession;
  } catch {
    return null;
  }
}

export function saveSession(session: ExamSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(sessionKey(session.testId), JSON.stringify(session));
}

export function clearSession(testId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(sessionKey(testId));
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function createSession(
  testId: string,
  durationMinutes: number,
  language: Lang
): ExamSession {
  const startedAt = Date.now();
  return {
    sessionId: randomId(),
    testId,
    startedAt,
    expiresAt: computeExpiresAt(startedAt, durationMinutes),
    language,
    currentQuestion: 0,
    answers: {},
    markedForReview: {},
    visited: {},
    submitted: false,
  };
}

// ─── Mutations (return new session, caller must saveSession) ──────────────────

export function setAnswer(session: ExamSession, questionId: string, option: OptionKey): ExamSession {
  return {
    ...session,
    answers: { ...session.answers, [questionId]: option },
    visited: { ...session.visited, [questionId]: true },
  };
}

export function clearAnswer(session: ExamSession, questionId: string): ExamSession {
  const answers = { ...session.answers };
  delete answers[questionId];
  return { ...session, answers };
}

export function toggleMarkForReview(session: ExamSession, questionId: string): ExamSession {
  const current = session.markedForReview[questionId] ?? false;
  return {
    ...session,
    markedForReview: { ...session.markedForReview, [questionId]: !current },
  };
}

export function setCurrentQuestion(session: ExamSession, index: number): ExamSession {
  return { ...session, currentQuestion: index };
}

export function markVisited(session: ExamSession, questionId: string): ExamSession {
  return {
    ...session,
    visited: { ...session.visited, [questionId]: true },
  };
}

export function setLanguage(session: ExamSession, lang: Lang): ExamSession {
  return { ...session, language: lang };
}

export function submitSession(session: ExamSession): ExamSession {
  return { ...session, submitted: true, submittedAt: Date.now() };
}

// ─── Question status helpers ──────────────────────────────────────────────────

export type QuestionStatusType =
  | 'not-visited'
  | 'answered'
  | 'not-answered'
  | 'marked-for-review'
  | 'answered-marked-for-review'
  | 'option-e';

export function getQuestionStatus(
  session: ExamSession,
  questionId: string
): QuestionStatusType {
  const visited = session.visited[questionId] ?? false;
  const answered = session.answers[questionId] !== undefined;
  const marked = session.markedForReview[questionId] ?? false;
  const isOptionE = session.answers[questionId] === 'E';

  if (!visited) return 'not-visited';
  if (isOptionE) return 'option-e';
  if (answered && marked) return 'answered-marked-for-review';
  if (marked) return 'marked-for-review';
  if (answered) return 'answered';
  return 'not-answered';
}
