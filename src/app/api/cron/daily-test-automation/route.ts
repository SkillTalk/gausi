/**
 * GET /api/cron/daily-test-automation
 *
 * Agent 4 — Daily automation cron endpoint.
 * Triggered by Vercel Cron at 22:30 UTC (04:00 AM IST) every day.
 *
 * Workflow:
 * 1. Verify CRON_SECRET
 * 2. Run automation orchestrator (generate → validate → schedule/publish)
 * 3. Return structured result
 *
 * Idempotent: running twice on the same day returns the existing run result.
 *
 * Security: protected by Authorization: Bearer CRON_SECRET header.
 * Environment variable required: CRON_SECRET (server-only, never NEXT_PUBLIC_).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Automation runs: topic selection + generate (~90 s) + validate + schedule/publish.
// Total is typically 120–200 s — must be explicit to avoid platform defaults.
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { runAutomation } from '@/lib/admin/automation.service';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[CRON:AUTO] CRON_SECRET is not set.');
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
    result = await runAutomation();
  } catch (err) {
    console.error('[CRON:AUTO] Unhandled error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Automation cron failed unexpectedly.' }, { status: 500 });
  }

  const elapsed = Date.now() - startMs;

  console.log(
    `[CRON:AUTO] status=${result.status} | runKey=${result.runKey ?? 'n/a'} | testId=${result.generatedTestId ?? 'n/a'} | ${elapsed}ms`,
  );

  return NextResponse.json({ ...result, elapsedMs: elapsed });
}
