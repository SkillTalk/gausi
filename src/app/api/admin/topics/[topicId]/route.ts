export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { updateTopic } from '@/lib/admin/topic-planner.service';
import { db } from '@/lib/db';

type Params = { topicId: string };

/** GET /api/admin/topics/[topicId] — fetch single topic */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const topic = await db.examTopic.findUnique({ where: { id: params.topicId } });
    if (!topic) return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    return NextResponse.json({ topic });
  } catch (err) {
    console.error('[TOPIC GET]', err);
    return NextResponse.json({ error: 'Failed to fetch topic.' }, { status: 500 });
  }
}

/** PUT /api/admin/topics/[topicId] — update topic */
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const allowed = [
    'topic', 'category', 'difficultyDefault', 'questionCountDefault',
    'durationMinutesDefault', 'priority', 'cooldownDays', 'notes',
    'enabled', 'status', 'sequenceOrder', 'earliestUseDate', 'preferredDayOfWeek',
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in b) data[key] = b[key];
  }

  try {
    const updated = await updateTopic(params.topicId, data);
    return NextResponse.json({ topic: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    if (msg.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    }
    console.error('[TOPIC PUT]', err);
    return NextResponse.json({ error: 'Failed to update topic.' }, { status: 500 });
  }
}
