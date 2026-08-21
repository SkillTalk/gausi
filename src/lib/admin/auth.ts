/**
 * Admin Authentication — Session + Password Utilities
 *
 * Uses Web Crypto API so this module works in BOTH:
 *   - Next.js Middleware  (Edge runtime)
 *   - API routes          (Node.js runtime)
 *
 * Session token format:
 *   <base64url(payload)>.<hmac-sha256-hex>
 *   payload = { iat, exp, v: 1 }
 *
 * Cookie: gausi_admin_session — HttpOnly, Secure, SameSite=Lax, Path=/
 *
 * NEVER import this in client components.
 */

export const COOKIE_NAME = 'gausi_admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

// ─── Helpers ──────────────────────────────────────────────────────────────────

function base64urlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(data: string): string {
  const padded = data + '='.repeat((4 - (data.length % 4)) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) ?? [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── HMAC-SHA256 via Web Crypto ───────────────────────────────────────────────

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return bytesToHex(new Uint8Array(sig));
}

async function hmacVerify(payload: string, sigHex: string, secret: string): Promise<boolean> {
  const key = await importHmacKey(secret);
  const enc = new TextEncoder();
  const sigBytes = hexToBytes(sigHex);
  return crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
}

// ─── Session Secret Guard ─────────────────────────────────────────────────────

/**
 * Returns the session secret or throws if missing.
 * Fail-closed: missing secret blocks ALL admin access.
 */
export function getSessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error('ADMIN_SESSION_SECRET is not configured. Admin access is blocked.');
  return s;
}

// ─── Session Token ────────────────────────────────────────────────────────────

type Payload = { iat: number; exp: number; v: number };

export async function createSessionToken(): Promise<string> {
  const secret = getSessionSecret();
  const now = Date.now();
  const payload: Payload = { iat: now, exp: now + SESSION_DURATION_MS, v: 1 };
  const encoded = base64urlEncode(JSON.stringify(payload));
  const sig = await hmacSign(encoded, secret);
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = getSessionSecret();
    const dotIdx = token.indexOf('.');
    if (dotIdx === -1) return false;

    const encoded = token.slice(0, dotIdx);
    const sigHex = token.slice(dotIdx + 1);

    // Verify HMAC (Web Crypto does constant-time comparison internally)
    const valid = await hmacVerify(encoded, sigHex, secret);
    if (!valid) return false;

    // Decode and check expiry
    const payload: Payload = JSON.parse(base64urlDecode(encoded));
    if (payload.v !== 1) return false;
    if (Date.now() > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

// ─── Password Validation ──────────────────────────────────────────────────────

/**
 * Constant-time password comparison using Web Crypto HMAC.
 *
 * Strategy: derive HMAC(fixedKey, submitted) as a "signature" bytes, then call
 * crypto.subtle.verify(key, signature, adminPassword) which performs
 * HMAC(fixedKey, adminPassword) internally and compares in constant time.
 * The result is true iff HMAC(submitted) == HMAC(adminPassword), i.e., passwords match.
 * Length differences in the original passwords are hidden because HMAC output is always
 * fixed-length (32 bytes for SHA-256).
 */
export async function validateAdminPassword(submitted: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const fixedKey = 'gausi-admin-pw-compare-v1';
  try {
    const enc = new TextEncoder();
    const key = await importHmacKey(fixedKey);
    // Compute HMAC of the submitted password → use as the "expected signature"
    const submittedSig = await crypto.subtle.sign('HMAC', key, enc.encode(submitted));
    // verify: computes HMAC(key, adminPassword) and compares to submittedSig (constant-time)
    return await crypto.subtle.verify('HMAC', key, submittedSig, enc.encode(adminPassword));
  } catch {
    return false;
  }
}

// ─── Cookie Options ───────────────────────────────────────────────────────────

export type CookieOptions = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
};

export function sessionCookieOptions(value: string): CookieOptions {
  return {
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000, // 8 hours
  };
}

export function clearCookieOptions(): CookieOptions {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Immediate expiry
  };
}

// ─── Next redirect guard ──────────────────────────────────────────────────────

/**
 * Validates a `?next=` redirect value.
 * Only allows internal /admin/* paths to prevent open redirects.
 */
export function safeNextRedirect(next: string | null | undefined): string {
  if (!next) return '/admin/tests';
  // Must be a relative path starting with /admin/ and not the login page
  if (next.startsWith('/admin/') && !next.startsWith('/admin/login') && !next.includes('..')) {
    return next;
  }
  return '/admin/tests';
}
