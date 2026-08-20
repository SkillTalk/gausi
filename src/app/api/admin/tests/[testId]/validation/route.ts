/**
 * GET /api/admin/tests/[testId]/validation
 *
 * Returns the latest stored validation result for a test.
 * Returns { validation: null } if no validation has been run yet.
 * Does NOT trigger re-validation (that is POST /validate).
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type Params = { params: Promise<{ testId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { testId } = await params;

  try {
    const validation = await db.testValidation.findUnique({
      where: { testId },
      include: {
        questionResults: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!validation) {
      return NextResponse.json({ validation: null });
    }

    return NextResponse.json({ validation });
  } catch (err) {
    console.error(`[VALIDATION GET:${testId}]`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load validation results.' }, { status: 500 });
  }
}
