/**
 * Timer logic — all time calculations use a persistent `expiresAt` timestamp.
 *
 * The timer NEVER resets on refresh; remaining time is always computed as:
 *   expiresAt - Date.now()
 *
 * This file is pure (no browser APIs) so it can be tested in Node/Vitest.
 */

/** Returns remaining milliseconds. 0 if expired. */
export function getRemainingMs(expiresAt: number, now: number = Date.now()): number {
  return Math.max(0, expiresAt - now);
}

/** Returns true if the exam has expired. */
export function isExpired(expiresAt: number, now: number = Date.now()): boolean {
  return now >= expiresAt;
}

/** Compute the expiresAt timestamp from a start time and duration in minutes. */
export function computeExpiresAt(startedAt: number, durationMinutes: number): number {
  return startedAt + durationMinutes * 60 * 1000;
}

/** Returns a timer CSS class based on remaining time (for colour coding). */
export function timerColourClass(remainingMs: number): string {
  if (remainingMs <= 60_000) return 'text-red-600';
  if (remainingMs <= 5 * 60_000) return 'text-amber-600';
  return 'text-indigo-700';
}

/** Returns true when remaining time is ≤ 60 s (subtle pulse trigger). */
export function shouldPulse(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= 60_000;
}

/** Format milliseconds as MM:SS */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
