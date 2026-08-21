/**
 * POST /api/admin/auth/logout
 *
 * Clears the admin session cookie. No authentication required to call this
 * (logging out without a session is a no-op).
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { clearCookieOptions } from '@/lib/admin/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearCookieOptions());
  return response;
}
