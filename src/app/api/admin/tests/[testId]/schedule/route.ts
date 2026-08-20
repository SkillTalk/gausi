/**
 * POST /api/admin/tests/[testId]/schedule
 *
 * Schedule a READY test for future publication.
 * Body: { publishAt: ISO string (UTC) }
 *
 * Transitions: READY → SCHEDULED
 * The Vercel cron at /api/cron/publish-scheduled-tests will pick it up.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { scheduleTest } from '@/lib/admin/publish.service';

type Params = { params: Promise<{ testId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { testId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!b.publishAt || typeof b.publishAt !== 'string') {
    return NextResponse.json({ error: 'publishAt (ISO UTC string) is required.' }, { status: 400 });
  }

  const publishAt = new Date(b.publishAt);
  if (isNaN(publishAt.getTime())) {
    return NextResponse.json({ error: 'publishAt is not a valid date.' }, { status: 400 });
  }

  const result = await scheduleTest(testId, publishAt);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.httpStatus });
  }

  return NextResponse.json({
    status: 'SCHEDULED',
    publishAt: result.data?.publishAt?.toISOString(),
  });
}
