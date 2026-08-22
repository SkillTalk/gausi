/**
 * POST /api/admin/tests/[testId]/questions/[questionId]/override-answer
 *
 * Admin manually overrides the correct answer on a non-PUBLISHED question.
 * No AI call is made — admin takes authority for the answer key.
 *
 * Body: { correctOption: "A"|"B"|"C"|"D", adminNote?: string }
 *
 * Returns: { ok, questionId, newCorrectOption, newQuestionVersion, newTestStatus,
 *             overrideAuditId, explanationWarning? }
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { overrideAnswer } from '@/lib/admin/answer-override.service';

type Params = { params: Promise<{ testId: string; questionId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { testId, questionId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { correctOption, adminNote } = body;

  if (typeof correctOption !== 'string' || !correctOption.trim()) {
    return NextResponse.json(
      { error: 'correctOption is required (A, B, C, or D).' },
      { status: 400 },
    );
  }

  if (adminNote !== undefined && typeof adminNote !== 'string') {
    return NextResponse.json({ error: 'adminNote must be a string.' }, { status: 400 });
  }

  if (typeof adminNote === 'string' && adminNote.length > 500) {
    return NextResponse.json({ error: 'adminNote must be ≤ 500 characters.' }, { status: 400 });
  }

  const result = await overrideAnswer(
    testId,
    questionId,
    correctOption,
    adminNote as string | undefined,
  );

  if (!result.ok) {
    const status =
      result.stage === 'VALIDATE' ? 400 :
      result.stage === 'LOAD' ? 404 :
      result.stage === 'STATUS_CHECK' ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
