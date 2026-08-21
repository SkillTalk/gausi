export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getNextEligibleTopic } from '@/lib/admin/topic-planner.service';
import { getAutomationConfig } from '@/lib/admin/automation.service';

/** GET /api/admin/topics/next — preview next eligible topic (read-only, no side effects) */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const exam = sp.get('exam') ?? 'BPSC TRE 4';
  const allowRepeat = sp.get('allowRepeat') === 'true';

  try {
    const [topic, config] = await Promise.all([
      getNextEligibleTopic({ exam, allowRepeat }),
      getAutomationConfig(),
    ]);
    return NextResponse.json({ topic, configTopicMode: config?.topicMode ?? 'MANUAL' });
  } catch (err) {
    console.error('[TOPICS NEXT]', err);
    return NextResponse.json({ error: 'Failed to preview next topic.' }, { status: 500 });
  }
}
