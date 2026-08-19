import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePendingAttempt,
  loadPendingAttempt,
  clearPendingAttempt,
  generateIdempotencyKey,
} from '@/lib/exam/pending-attempt';
import type { PendingSubmission } from '@/types/exam';

const makePending = (overrides: Partial<PendingSubmission> = {}): PendingSubmission => ({
  idempotencyKey: 'key-abc-123',
  userId: 'user_01',
  testId: 'bpsc-tre4-1857',
  testSlug: '2026-08-19-1857',
  testTitle: '1857 Revolt',
  subject: 'History',
  topic: null,
  language: 'hi',
  startedAt: Date.now() - 10_000,
  submittedAt: Date.now(),
  submissionReason: 'manual',
  timeUsedSeconds: 10,
  answers: { 'q-01': 'B', 'q-02': 'A' },
  ...overrides,
});

describe('pending-attempt localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads a pending attempt', () => {
    const p = makePending();
    savePendingAttempt(p);
    const loaded = loadPendingAttempt();
    expect(loaded).toEqual(p);
  });

  it('returns null when nothing is stored', () => {
    expect(loadPendingAttempt()).toBeNull();
  });

  it('clears the pending attempt', () => {
    savePendingAttempt(makePending());
    clearPendingAttempt();
    expect(loadPendingAttempt()).toBeNull();
  });

  it('overwrites existing pending attempt with new one', () => {
    savePendingAttempt(makePending({ idempotencyKey: 'key-old' }));
    savePendingAttempt(makePending({ idempotencyKey: 'key-new' }));
    const loaded = loadPendingAttempt();
    expect(loaded?.idempotencyKey).toBe('key-new');
  });
});

describe('generateIdempotencyKey', () => {
  it('generates different keys on each call', () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateIdempotencyKey()));
    expect(keys.size).toBe(20);
  });

  it('key length is reasonable (>16 chars)', () => {
    const key = generateIdempotencyKey();
    expect(key.length).toBeGreaterThan(16);
  });
});

describe('retry idempotency contract', () => {
  it('same idempotencyKey preserved through save/load cycle', () => {
    const key = generateIdempotencyKey();
    const p = makePending({ idempotencyKey: key });
    savePendingAttempt(p);
    const loaded = loadPendingAttempt();
    // The same key must be used on retry — server deduplicates on this key
    expect(loaded?.idempotencyKey).toBe(key);
  });
});
