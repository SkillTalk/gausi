/**
 * GET /api/admin/tests
 * Returns all generated tests, newest first. No questions included (use [testId] for that).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  // ── Stale GENERATING recovery ─────────────────────────────────────────────
  // If Vercel hard-terminates a function, the finally/markFailed cleanup is not
  // guaranteed. Any record still in GENERATING after 8 minutes is definitively
  // stale (maxDuration=300 s + 180 s retry budget + 5 min margin = 8 min).
  // We auto-mark them DRAFT here so the admin sees a clean, actionable list.
  // Only GENERATING records are touched — all other statuses are never modified.
  const staleThreshold = new Date(Date.now() - 8 * 60 * 1000);
  await db.generatedTest
    .updateMany({
      where: { status: 'GENERATING', updatedAt: { lt: staleThreshold } },
      data: {
        status: 'DRAFT',
        errorMessage: 'Generation timed out — platform terminated. Please retry.',
      },
    })
    .catch((err: unknown) => {
      console.error(
        '[ADMIN TESTS LIST] Stale recovery failed (non-fatal):',
        err instanceof Error ? err.message : err,
      );
    });

  try {
    const tests = await db.generatedTest.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        exam: true,
        category: true,
        topic: true,
        slug: true,
        titleHi: true,
        titleEn: true,
        difficulty: true,
        totalQuestions: true,
        durationMinutes: true,
        status: true,
        plannedPublishAt: true,
        generationModel: true,
        generationMs: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ tests });
  } catch (err) {
    console.error('[ADMIN TESTS LIST]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load tests.' }, { status: 500 });
  }
}
