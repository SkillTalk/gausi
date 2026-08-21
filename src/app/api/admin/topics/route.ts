export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listTopics, createTopic, getTopicStats } from '@/lib/admin/topic-planner.service';

/** GET /api/admin/topics — list topics with optional filters + stats */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const exam = sp.get('exam') ?? 'BPSC TRE 4';
  const category = sp.get('category') ?? undefined;
  const status = sp.get('status') ?? undefined;

  try {
    const [topics, stats] = await Promise.all([
      listTopics({ exam, category, status }),
      getTopicStats(exam),
    ]);
    return NextResponse.json({ topics, stats });
  } catch (err) {
    console.error('[TOPICS GET]', err);
    return NextResponse.json({ error: 'Failed to list topics.' }, { status: 500 });
  }
}

/** POST /api/admin/topics — create a single topic */
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const exam = typeof b.exam === 'string' ? b.exam.trim() : '';
  const category = typeof b.category === 'string' ? b.category.trim() : '';
  const topic = typeof b.topic === 'string' ? b.topic.trim() : '';

  if (!exam || !category || !topic) {
    return NextResponse.json({ error: 'exam, category, and topic are required.' }, { status: 400 });
  }

  try {
    const created = await createTopic({
      exam,
      category,
      topic,
      difficultyDefault: typeof b.difficultyDefault === 'string' ? b.difficultyDefault : null,
      questionCountDefault: typeof b.questionCountDefault === 'number' ? b.questionCountDefault : null,
      durationMinutesDefault: typeof b.durationMinutesDefault === 'number' ? b.durationMinutesDefault : null,
      priority: typeof b.priority === 'number' ? b.priority : 50,
      cooldownDays: typeof b.cooldownDays === 'number' ? b.cooldownDays : 30,
      notes: typeof b.notes === 'string' ? b.notes : null,
      enabled: b.enabled !== false,
    });
    return NextResponse.json({ topic: created }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A topic with this name already exists in this category.' }, { status: 409 });
    }
    console.error('[TOPICS POST]', err);
    return NextResponse.json({ error: 'Failed to create topic.' }, { status: 500 });
  }
}
