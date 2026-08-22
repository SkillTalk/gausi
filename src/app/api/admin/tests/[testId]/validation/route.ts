/**
 * GET /api/admin/tests/[testId]/validation
 *
 * Returns the latest stored validation result for a test, augmented with
 * per-question freshness metadata.
 *
 * Added fields (derived, not stored in DB):
 *   isStale:            true when test.contentVersion > validation.contentVersion
 *   staleQuestionIds:   questionIds where GQ.questionVersion ≠ QVR.questionVersion
 *                       (authoritative: used for "Revalidate N Questions" button)
 *   repairedQuestionIds: legacy list from QuestionRepairLog (kept for old renders)
 *   questionsValidated:  from the most recent incremental run (stored in DB)
 *
 * Returns { validation: null } if no validation has been run yet.
 * Does NOT trigger re-validation (that is POST /validate).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeValidationFreshness, computeStaleQuestions } from '@/lib/admin/validation-freshness';

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
        select: {
          contentVersion: true,
          questions: {
            select: { id: true, questionVersion: true },
            orderBy: { order: 'asc' },
          },
        },
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

    // Legacy test-level freshness (contentVersion comparison)
    const { isStale, repairedQuestionIds } = computeValidationFreshness(
      testRow?.contentVersion ?? validation.contentVersion,
      validation.contentVersion,
      repairLogs.map((r) => ({ questionId: r.questionId, createdAt: new Date(r.createdAt) })),
      new Date(validation.validatedAt),
    );

    // Per-question freshness (authoritative for incremental revalidation UI)
    const staleQuestionIds = computeStaleQuestions(
      testRow?.questions ?? [],
      validation.questionResults.map((qvr) => ({
        questionId: qvr.questionId,
        questionVersion: (qvr as typeof qvr & { questionVersion?: number }).questionVersion ?? 1,
      })),
    );

    return NextResponse.json({
      validation: {
        ...validation,
        isStale,
        staleQuestionIds,
        repairedQuestionIds,
      },
    });
  } catch (err) {
    console.error(`[VALIDATION GET:${testId}]`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load validation results.' }, { status: 500 });
  }
}
