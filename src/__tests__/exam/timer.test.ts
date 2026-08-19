import { describe, it, expect } from 'vitest';
import {
  getRemainingMs,
  isExpired,
  computeExpiresAt,
  timerColourClass,
  shouldPulse,
} from '@/lib/exam/timer';

describe('computeExpiresAt', () => {
  it('adds durationMinutes to startedAt', () => {
    const start = 1_000_000;
    expect(computeExpiresAt(start, 15)).toBe(start + 15 * 60 * 1000);
  });
});

describe('getRemainingMs', () => {
  it('returns positive remaining time when not expired', () => {
    const now = 1_000_000;
    const expiresAt = now + 300_000;
    expect(getRemainingMs(expiresAt, now)).toBe(300_000);
  });

  it('returns 0 when expired', () => {
    const now = 1_000_000;
    const expiresAt = now - 1000;
    expect(getRemainingMs(expiresAt, now)).toBe(0);
  });

  it('returns 0 when exactly at expiry', () => {
    const now = 1_000_000;
    expect(getRemainingMs(now, now)).toBe(0);
  });

  it('survives page refresh — same result with same inputs', () => {
    const expiresAt = 9_000_000;
    const now = 8_500_000;
    expect(getRemainingMs(expiresAt, now)).toBe(500_000);
    // Simulating refresh — same inputs, same output
    expect(getRemainingMs(expiresAt, now)).toBe(500_000);
  });
});

describe('isExpired', () => {
  it('returns false when time remains', () => {
    expect(isExpired(Date.now() + 60_000, Date.now())).toBe(false);
  });

  it('returns true when expired', () => {
    expect(isExpired(Date.now() - 1000, Date.now())).toBe(true);
  });
});

describe('timerColourClass', () => {
  it('returns indigo for > 5 minutes remaining', () => {
    expect(timerColourClass(6 * 60_000)).toBe('text-indigo-700');
  });

  it('returns amber for 3 minutes remaining', () => {
    expect(timerColourClass(3 * 60_000)).toBe('text-amber-600');
  });

  it('returns red for <= 60 seconds', () => {
    expect(timerColourClass(60_000)).toBe('text-red-600');
    expect(timerColourClass(30_000)).toBe('text-red-600');
    expect(timerColourClass(0)).toBe('text-red-600');
  });
});

describe('shouldPulse', () => {
  it('returns true for 30 seconds remaining', () => {
    expect(shouldPulse(30_000)).toBe(true);
  });

  it('returns true for exactly 60 seconds', () => {
    expect(shouldPulse(60_000)).toBe(true);
  });

  it('returns false for > 60 seconds', () => {
    expect(shouldPulse(61_000)).toBe(false);
  });

  it('returns false when expired', () => {
    expect(shouldPulse(0)).toBe(false);
  });
});
