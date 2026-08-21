export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { archiveTopic } from '@/lib/admin/topic-planner.service';

export async function POST(_req: NextRequest, { params }: { params: { topicId: string } }) {
  try {
    const topic = await archiveTopic(params.topicId);
    return NextResponse.json({ topic });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    if (msg.includes('Record to update not found')) return NextResponse.json({ error: 'Topic not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to archive topic.' }, { status: 500 });
  }
}
