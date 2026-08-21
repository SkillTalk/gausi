/**
 * GET /api/admin/automation/runs — list recent automation runs
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAutomationConfig } from '@/lib/admin/automation.service';

export async function GET() {
  try {
    const config = await getAutomationConfig();
    if (!config) {
      return NextResponse.json({ runs: [] });
    }

    const runs = await db.automationRun.findMany({
      where: { configId: config.id },
      orderBy: { scheduledFor: 'desc' },
      take: 30,
    });

    return NextResponse.json({ runs });
  } catch (err) {
    console.error('[AUTO RUNS GET]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load runs.' }, { status: 500 });
  }
}
