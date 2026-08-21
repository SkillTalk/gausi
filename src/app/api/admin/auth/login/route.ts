/**
 * POST /api/admin/auth/login
 *
 * Validates ADMIN_PASSWORD and issues a signed HttpOnly session cookie.
 * Rate-limited (5 failed attempts per IP per 15 min — best-effort in serverless).
 *
 * Never logs submitted passwords.
 * Never reveals whether password was "close" or "correct format".
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  validateAdminPassword,
  createSessionToken,
  sessionCookieOptions,
  safeNextRedirect,
} from '@/lib/admin/auth';

// ─── In-memory rate limiter (best-effort in serverless) ───────────────────────

type AttemptRecord = { count: number; windowStart: number };
const failedAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record) return false;
  if (now - record.windowStart > WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record || now - record.windowStart > WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, windowStart: now });
  } else {
    record.count += 1;
  }
}

function clearFailures(ip: string): void {
  failedAttempts.delete(ip);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Please try again later.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const submitted = typeof (body as Record<string, unknown>).password === 'string'
    ? ((body as Record<string, unknown>).password as string)
    : '';

  if (!submitted) {
    recordFailure(ip);
    return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
  }

  const valid = await validateAdminPassword(submitted);

  if (!valid) {
    recordFailure(ip);
    return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
  }

  // ── Login successful ────────────────────────────────────────────────────────
  clearFailures(ip);

  let token: string;
  try {
    token = await createSessionToken();
  } catch (err) {
    console.error('[AUTH LOGIN] Failed to create session:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Session configuration error.' }, { status: 503 });
  }

  const opts = sessionCookieOptions(token);
  const rawNext = typeof (body as Record<string, unknown>).next === 'string'
    ? ((body as Record<string, unknown>).next as string)
    : null;
  const redirectTo = safeNextRedirect(rawNext);

  const response = NextResponse.json({ ok: true, redirectTo });
  response.cookies.set(opts);
  return response;
}
