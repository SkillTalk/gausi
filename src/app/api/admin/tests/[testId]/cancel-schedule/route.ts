/**
 * POST /api/admin/tests/[testId]/cancel-schedule
 *
 * Cancel a SCHEDULED test and revert it to READY.
 * SCHEDULED → READY
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cancelSchedule } from '@/lib/admin/publish.service';

type Params = { params: Promise<{ testId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { testId } = await params;

  const result = await cancelSchedule(testId);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.httpStatus });
  }

  return NextResponse.json({ status: 'READY' });
}
