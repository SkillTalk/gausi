import type { RevisionQuestion, OptionKey, CorrectOptionKey } from '@/types/exam';

const REVISION_KEY = 'exam-revision-questions';

function loadAll(): RevisionQuestion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REVISION_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RevisionQuestion[];
  } catch {
    return [];
  }
}

function saveAll(items: RevisionQuestion[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REVISION_KEY, JSON.stringify(items));
}

export function getRevisionList(): RevisionQuestion[] {
  return loadAll().sort((a, b) => b.addedAt - a.addedAt);
}

export function addToRevision(
  questionId: string,
  testId: string,
  selectedOption: OptionKey | null,
  correctOption: CorrectOptionKey,
  reason: RevisionQuestion['reason']
): void {
  const existing = loadAll().filter((r) => !(r.id === questionId && r.testId === testId));
  const item: RevisionQuestion = {
    id: questionId,
    testId,
    addedAt: Date.now(),
    reason,
    selectedOption,
    correctOption,
  };
  saveAll([item, ...existing]);
}

export function removeFromRevision(questionId: string, testId: string): void {
  saveAll(loadAll().filter((r) => !(r.id === questionId && r.testId === testId)));
}

export function isInRevision(questionId: string, testId: string): boolean {
  return loadAll().some((r) => r.id === questionId && r.testId === testId);
}

export function clearRevision(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REVISION_KEY);
}
