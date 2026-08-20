/**
 * GET /api/admin/tests
 * Returns all generated tests, newest first. No questions included (use [testId] for that).
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
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
