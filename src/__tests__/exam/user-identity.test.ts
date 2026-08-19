import { describe, it, expect } from 'vitest';
import { normalizeEmail, isValidEmail, parseEmail } from '@/lib/user-identity';

describe('normalizeEmail', () => {
  it('trims leading/trailing whitespace', () => {
    expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
  });

  it('lowercases all characters', () => {
    expect(normalizeEmail('User@Test.COM')).toBe('user@test.com');
  });

  it('handles mixed case + whitespace', () => {
    expect(normalizeEmail('  HELLO@WORLD.ORG  ')).toBe('hello@world.org');
  });

  it('same email different capitalizations normalizes to same value', () => {
    const a = normalizeEmail('Student@BpsC.Gov.IN');
    const b = normalizeEmail('student@bpsc.gov.in');
    expect(a).toBe(b);
  });
});

describe('isValidEmail', () => {
  it('accepts standard emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b+tag@sub.domain.io')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(isValidEmail('notanemail')).toBe(false);
  });

  it('rejects missing TLD', () => {
    expect(isValidEmail('user@domain')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects only spaces', () => {
    expect(isValidEmail('   ')).toBe(false);
  });

  it('rejects email longer than 254 chars', () => {
    const long = 'a'.repeat(250) + '@b.co';
    expect(isValidEmail(long)).toBe(false);
  });
});

describe('parseEmail', () => {
  it('returns normalized email for valid input', () => {
    expect(parseEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('returns null for invalid input', () => {
    expect(parseEmail('notvalid')).toBe(null);
    expect(parseEmail('')).toBe(null);
  });

  it('uppercase variant resolves to same normalized email as lowercase', () => {
    const a = parseEmail('ADMIN@EXAM.IN');
    const b = parseEmail('admin@exam.in');
    expect(a).toBe(b);
    expect(a).toBe('admin@exam.in');
  });
});
