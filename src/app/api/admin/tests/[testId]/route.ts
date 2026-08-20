/**
 * GET  /api/admin/tests/[testId]  — fetch test with all questions
 * DELETE /api/admin/tests/[testId] — delete test + questions (CASCADE)
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Params = { params: Promise<{ testId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { testId } = await params;

  try {
    const test = await db.generatedTest.findUnique({
      where: { id: testId },
      include: {
        questions: { orderBy: { order: 'asc' } },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (err) {
    console.error('[ADMIN TEST GET]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load test.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { testId } = await params;

  try {
    const test = await db.generatedTest.findUnique({ where: { id: testId }, select: { status: true } });
    if (!test) {
      return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
    }

    // Immutability: published tests cannot be deleted; archive them instead.
    if (test.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'PUBLISHED tests cannot be deleted. Archive the test instead to hide it from public listings.' },
        { status: 409 }
      );
    }

    // Questions and validation results are CASCADE-deleted via FK
    await db.generatedTest.delete({ where: { id: testId } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
    }
    console.error('[ADMIN TEST DELETE]', msg);
    return NextResponse.json({ error: 'Failed to delete test.' }, { status: 500 });
  }
}
