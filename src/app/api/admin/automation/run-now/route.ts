/**
 * POST /api/admin/automation/run-now
 *
 * Admin-triggered run. Uses the same orchestration logic as the daily cron.
 * Requires explicit confirmation in the body: { "confirm": true }
 * Idempotent: returns existing run if today's run was already completed.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { runAutomation } from '@/lib/admin/automation.service';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!b.confirm) {
    return NextResponse.json(
      { error: 'Run Now requires { "confirm": true } in the request body.' },
      { status: 400 }
    );
  }

  try {
    // force=true bypasses the enabled check so admin can trigger even when auto-disabled
    const result = await runAutomation({ force: true });
    return NextResponse.json(result, { status: result.status === 'FAILED' ? 422 : 200 });
  } catch (err) {
    console.error('[RUN NOW]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Run Now failed unexpectedly.' }, { status: 500 });
  }
}
