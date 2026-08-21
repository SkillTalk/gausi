/**
 * Next.js Middleware — Admin Route Protection
 *
 * Runs in Edge runtime before every matched request.
 *
 * Protects:
 *   /admin/*          → redirects to /admin/login if no valid session
 *   /api/admin/*      → returns 401 JSON if no valid session
 *
 * Excluded (pass-through):
 *   /admin/login      → public login page
 *   /api/admin/auth/* → login/logout endpoints
 *   /api/cron/*       → use CRON_SECRET, not admin session
 */

import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifySessionToken, safeNextRedirect } from '@/lib/admin/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Always allow login page and auth endpoints ─────────────────────────────
  if (pathname === '/admin/login') return NextResponse.next();
  if (pathname.startsWith('/api/admin/auth/')) return NextResponse.next();

  // ── Always allow cron routes (handled by CRON_SECRET) ─────────────────────
  if (pathname.startsWith('/api/cron/')) return NextResponse.next();

  const isAdminPage = pathname.startsWith('/admin/');
  const isAdminApi = pathname.startsWith('/api/admin/');

  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  // ── Verify session ─────────────────────────────────────────────────────────
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let authenticated = false;

  if (token) {
    try {
      authenticated = await verifySessionToken(token);
    } catch {
      authenticated = false;
    }
  }

  if (authenticated) return NextResponse.next();

  // ── Unauthenticated: admin pages → login redirect ──────────────────────────
  if (isAdminPage) {
    const loginUrl = new URL('/admin/login', request.url);
    // Safe next redirect — only /admin/* paths
    const safePath = safeNextRedirect(pathname);
    if (safePath !== '/admin/tests') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // ── Unauthenticated: admin APIs → 401 ─────────────────────────────────────
  return NextResponse.json(
    { error: 'Admin authentication required.' },
    { status: 401 },
  );
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
