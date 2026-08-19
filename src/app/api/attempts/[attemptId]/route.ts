import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/** GET /api/attempts/[attemptId] — load a single historical attempt. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const { attemptId } = params;
  if (!attemptId) {
    return NextResponse.json({ error: 'attemptId is required' }, { status: 400 });
  }

  try {
    const attempt = await db.testAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    return NextResponse.json(attempt, { status: 200 });
  } catch (err) {
    console.error('[GET /api/attempts/[id]] DB error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
