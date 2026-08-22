/**
 * GET  /api/admin/automation/config  — load automation config
 * PUT  /api/admin/automation/config  — save automation config
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAutomationConfig, upsertAutomationConfig } from '@/lib/admin/automation.service';

export async function GET() {
  try {
    const config = await getAutomationConfig();
    return NextResponse.json({ config: config ?? null });
  } catch (err) {
    console.error('[AUTO CONFIG GET]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load config.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  // Whitelist allowed fields
  const allowed = {
    exam: typeof b.exam === 'string' ? b.exam.trim() : undefined,
    category: typeof b.category === 'string' ? b.category.trim() : undefined,
    topic: typeof b.topic === 'string' ? b.topic.trim() : undefined,
    difficulty: typeof b.difficulty === 'string' ? b.difficulty.trim() : undefined,
    totalQuestions: typeof b.totalQuestions === 'number' ? Math.max(5, Math.min(50, b.totalQuestions)) : undefined,
    durationMinutes: typeof b.durationMinutes === 'number' ? Math.max(5, Math.min(180, b.durationMinutes)) : undefined,
    enabled: typeof b.enabled === 'boolean' ? b.enabled : undefined,
    autoPublish: typeof b.autoPublish === 'boolean' ? b.autoPublish : undefined,
    allowRepeat: typeof b.allowRepeat === 'boolean' ? b.allowRepeat : undefined,
    generateTime: typeof b.generateTime === 'string' ? b.generateTime.trim() : undefined,
    publishTime: typeof b.publishTime === 'string' ? b.publishTime.trim() : undefined,
    timezone: typeof b.timezone === 'string' ? b.timezone.trim() : undefined,
    // topicMode was previously missing from this whitelist — that was the root cause
    // of the "Enable Queue Mode" button having no effect (field was silently stripped).
    topicMode:
      typeof b.topicMode === 'string' && ['MANUAL', 'QUEUE'].includes(b.topicMode)
        ? b.topicMode
        : undefined,
  };

  // Strip undefined
  const data = Object.fromEntries(
    Object.entries(allowed).filter(([, v]) => v !== undefined)
  ) as Parameters<typeof upsertAutomationConfig>[0];

  try {
    const config = await upsertAutomationConfig(data);
    return NextResponse.json({ config });
  } catch (err) {
    console.error('[AUTO CONFIG PUT]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to save config.' }, { status: 500 });
  }
}
