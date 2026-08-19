/**
 * Manages the "pending DB save" state for a submitted attempt.
 *
 * Flow:
 *   1. After local submit, write pending attempt here.
 *   2. Attempt server save. On success, clear this key.
 *   3. On failure, pending stays — result page offers Retry Save.
 *   4. On retry, read pending and re-POST. Server idempotencyKey prevents duplicates.
 */

import type { PendingSubmission } from '@/types/exam';

const PENDING_KEY = 'gausi:pending-attempt';

export function savePendingAttempt(p: PendingSubmission): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PENDING_KEY, JSON.stringify(p));
}

export function loadPendingAttempt(): PendingSubmission | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSubmission;
  } catch {
    return null;
  }
}

export function clearPendingAttempt(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PENDING_KEY);
}

/** Generate a random idempotency key for a new submission. */
export function generateIdempotencyKey(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  );
}
