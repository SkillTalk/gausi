/**
 * GET /api/cron/publish-scheduled-tests
 *
 * Agent 3 — Vercel Cron endpoint.
 * Publishes all SCHEDULED tests whose publishAt <= now.
 *
 * Security: protected by CRON_SECRET header (Authorization: Bearer <secret>).
 * Vercel automatically sends this when configured in vercel.json + env vars.
 *
 * Idempotent: running twice does not duplicate publications.
 *
 * Environment variables required:
 *   CRON_SECRET — set in Vercel dashboard, never expose client-side.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { publishDueScheduledTests } from '@/lib/admin/publish.service';

export async function GET(request: NextRequest) {
  // Verify the cron secret from Vercel (or manual caller)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET env var is not set.');
    return NextResponse.json({ error: 'Cron is not configured.' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const startMs = Date.now();
  let result;

  try {
    result = await publishDueScheduledTests();
  } catch (err) {
    console.error('[CRON] publish-scheduled-tests failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Cron execution failed.' }, { status: 500 });
  }

  const elapsed = Date.now() - startMs;

  console.log(
    `[CRON] publish-scheduled-tests | processed=${result.processed} published=${result.published} blocked=${result.blocked} | ${elapsed}ms`,
  );

  if (result.errors.length > 0) {
    console.warn('[CRON] Some tests were blocked:', result.errors);
  }

  return NextResponse.json({ ...result, elapsedMs: elapsed });
}
