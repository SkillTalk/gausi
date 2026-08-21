/**
 * Admin Authentication Tests
 *
 * All secrets are mocked — no real environment values are used.
 * Uses Web Crypto API (available in Node.js 18+).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ─── Mock environment ─────────────────────────────────────────────────────────

const MOCK_SESSION_SECRET = 'test-session-secret-at-least-32-chars-long';
const MOCK_PASSWORD = 'SuperSecureAdminPassword123!';

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = MOCK_SESSION_SECRET;
  process.env.ADMIN_PASSWORD = MOCK_PASSWORD;
});

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_PASSWORD;
});

// Import after env is set (module-level calls would fail otherwise)
import {
  createSessionToken,
  verifySessionToken,
  validateAdminPassword,
  safeNextRedirect,
  getSessionSecret,
  COOKIE_NAME,
} from '@/lib/admin/auth';

// ─── Cookie name ──────────────────────────────────────────────────────────────

describe('COOKIE_NAME', () => {
  it('is the expected constant', () => {
    expect(COOKIE_NAME).toBe('gausi_admin_session');
  });
});

// ─── getSessionSecret ─────────────────────────────────────────────────────────

describe('getSessionSecret', () => {
  it('returns secret when configured', () => {
    expect(getSessionSecret()).toBe(MOCK_SESSION_SECRET);
  });

  it('throws when ADMIN_SESSION_SECRET is missing', () => {
    delete process.env.ADMIN_SESSION_SECRET;
    expect(() => getSessionSecret()).toThrow('ADMIN_SESSION_SECRET is not configured');
  });
});

// ─── Session Token ────────────────────────────────────────────────────────────

describe('createSessionToken', () => {
  it('creates a non-empty token', async () => {
    const token = await createSessionToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('token has two parts separated by a dot', async () => {
    const token = await createSessionToken();
    const parts = token.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(10);
    expect(parts[1].length).toBe(64); // SHA-256 = 32 bytes = 64 hex chars
  });

  it('throws when session secret is missing', async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    await expect(createSessionToken()).rejects.toThrow();
  });
});

describe('verifySessionToken', () => {
  it('verifies a freshly created token', async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it('rejects an empty string', async () => {
    expect(await verifySessionToken('')).toBe(false);
  });

  it('rejects a token with no dot', async () => {
    expect(await verifySessionToken('notadottoken')).toBe(false);
  });

  it('rejects a forged token (wrong HMAC)', async () => {
    const token = await createSessionToken();
    const [payload] = token.split('.');
    const forgedToken = `${payload}.${'a'.repeat(64)}`;
    expect(await verifySessionToken(forgedToken)).toBe(false);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken();
    // Change secret and verify should fail
    process.env.ADMIN_SESSION_SECRET = 'different-secret-that-is-different-enough';
    expect(await verifySessionToken(token)).toBe(false);
  });

  it('rejects an expired token', async () => {
    // Create token and manually make payload expire in the past
    const now = Date.now();
    const expiredPayload = JSON.stringify({ iat: now - 9 * 3600_000, exp: now - 1, v: 1 });

    // base64url encode
    const encoded = btoa(expiredPayload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Sign with correct secret
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(MOCK_SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded));
    const sigHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const expiredToken = `${encoded}.${sigHex}`;
    expect(await verifySessionToken(expiredToken)).toBe(false);
  });

  it('rejects a token with wrong version (v≠1)', async () => {
    const encoder = new TextEncoder();
    const now = Date.now();
    const badPayload = JSON.stringify({ iat: now, exp: now + 8 * 3600_000, v: 99 });
    const encoded = btoa(badPayload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(MOCK_SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded));
    const sigHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(await verifySessionToken(`${encoded}.${sigHex}`)).toBe(false);
  });

  it('rejects a completely random string', async () => {
    expect(await verifySessionToken('completely.random.garbage.string')).toBe(false);
  });

  it('returns false (not throws) when session secret is missing', async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    expect(await verifySessionToken('any.token')).toBe(false);
  });
});

// ─── Password validation ──────────────────────────────────────────────────────

describe('validateAdminPassword', () => {
  it('accepts the correct password', async () => {
    expect(await validateAdminPassword(MOCK_PASSWORD)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    expect(await validateAdminPassword('WrongPassword!')).toBe(false);
  });

  it('rejects an empty password', async () => {
    expect(await validateAdminPassword('')).toBe(false);
  });

  it('rejects when ADMIN_PASSWORD env is missing', async () => {
    delete process.env.ADMIN_PASSWORD;
    expect(await validateAdminPassword(MOCK_PASSWORD)).toBe(false);
  });

  it('is case-sensitive', async () => {
    expect(await validateAdminPassword(MOCK_PASSWORD.toLowerCase())).toBe(false);
    expect(await validateAdminPassword(MOCK_PASSWORD.toUpperCase())).toBe(false);
  });
});

// ─── Safe next redirect ───────────────────────────────────────────────────────

describe('safeNextRedirect', () => {
  it('returns /admin/tests for null', () => {
    expect(safeNextRedirect(null)).toBe('/admin/tests');
  });

  it('returns /admin/tests for undefined', () => {
    expect(safeNextRedirect(undefined)).toBe('/admin/tests');
  });

  it('returns /admin/tests for empty string', () => {
    expect(safeNextRedirect('')).toBe('/admin/tests');
  });

  it('allows internal /admin/* paths', () => {
    expect(safeNextRedirect('/admin/automation')).toBe('/admin/automation');
    expect(safeNextRedirect('/admin/tests/abc123')).toBe('/admin/tests/abc123');
  });

  it('blocks /admin/login to prevent redirect loops', () => {
    expect(safeNextRedirect('/admin/login')).toBe('/admin/tests');
  });

  it('blocks external URLs (open redirect prevention)', () => {
    expect(safeNextRedirect('https://evil.com')).toBe('/admin/tests');
    expect(safeNextRedirect('//evil.com')).toBe('/admin/tests');
    expect(safeNextRedirect('http://evil.com/admin/')).toBe('/admin/tests');
  });

  it('blocks paths with ".." traversal', () => {
    expect(safeNextRedirect('/admin/../etc/passwd')).toBe('/admin/tests');
  });

  it('blocks non-admin internal paths', () => {
    expect(safeNextRedirect('/tre4/daily')).toBe('/admin/tests');
    expect(safeNextRedirect('/')).toBe('/admin/tests');
  });
});
