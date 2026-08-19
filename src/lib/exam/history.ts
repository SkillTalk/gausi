import type { AttemptRecord, ExamResult, ExamTest } from '@/types/exam';

const HISTORY_KEY = 'exam-attempt-history';
const MAX_HISTORY = 100;

function loadAll(): AttemptRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AttemptRecord[];
  } catch {
    return [];
  }
}

function saveAll(records: AttemptRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_HISTORY)));
}

export function getHistory(): AttemptRecord[] {
  return loadAll().sort((a, b) => b.completedAt - a.completedAt);
}

export function addAttempt(test: ExamTest, result: ExamResult): void {
  const record: AttemptRecord = {
    id: result.sessionId,
    testId: test.id,
    testTitle: test.title,
    date: test.date,
    completedAt: result.completedAt,
    score: result.score,
    maxScore: result.maxScore,
    correct: result.correct,
    wrong: result.wrong,
    optionE: result.optionE,
    unanswered: result.unanswered,
    accuracy: result.accuracy,
    timeUsedMs: result.timeUsedMs,
  };
  const existing = loadAll().filter((r) => r.id !== record.id);
  saveAll([record, ...existing]);
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}
