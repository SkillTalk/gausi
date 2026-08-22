/**
 * GET /api/admin/tests/[testId]/validation
 *
 * Returns the latest stored validation result for a test, augmented with
 * freshness metadata derived from QuestionRepairLog and GeneratedTest.contentVersion.
 *
 * Added fields (derived, not stored in DB):
 *   isStale:             true when test was repaired since last validation
 *   repairedQuestionIds: questionIds repaired after validatedAt
 *
 * A QuestionValidationResult produced at contentVersion N must NOT be rendered
 * as current for a question at contentVersion N+1.
 *
 * Returns { validation: null } if no validation has been run yet.
 * Does NOT trigger re-validation (that is POST /validate).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeValidationFreshness } from '@/lib/admin/validation-freshness';

type Params = { params: Promise<{ testId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { testId } = await params;

  try {
    const [validation, testRow, repairLogs] = await Promise.all([
      db.testValidation.findUnique({
        where: { testId },
        include: { questionResults: { orderBy: { order: 'asc' } } },
      }),
      db.generatedTest.findUnique({
        where: { id: testId },
        select: { contentVersion: true },
      }),
      db.questionRepairLog.findMany({
        where: { testId },
        select: { questionId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!validation) {
      return NextResponse.json({ validation: null });
    }

    // Compute freshness: compare test.contentVersion vs validation.contentVersion
    const { isStale, repairedQuestionIds } = computeValidationFreshness(
      testRow?.contentVersion ?? validation.contentVersion,
      validation.contentVersion,
      repairLogs.map((r) => ({ questionId: r.questionId, createdAt: new Date(r.createdAt) })),
      new Date(validation.validatedAt),
    );

    return NextResponse.json({
      validation: {
        ...validation,
        isStale,
        repairedQuestionIds,
      },
    });
  } catch (err) {
    console.error(`[VALIDATION GET:${testId}]`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load validation results.' }, { status: 500 });
  }
}
