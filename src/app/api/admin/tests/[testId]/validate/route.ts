/**
 * POST /api/admin/tests/[testId]/validate
 *
 * Agent 2 — Validator / Reviewer.
 * Delegates to validation.service.ts for core logic.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { validateTest } from '@/lib/admin/validation.service';

type Params = { params: Promise<{ testId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { testId } = await params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 503 });
  }

  const result = await validateTest(testId, apiKey);

  if (!result.ok) {
    const status =
      result.stage === 'LOAD' ? (result.error.includes('not found') ? 404 : 500) :
      result.stage === 'STATUS_UPDATE' ? 409 :
      result.stage === 'AI_CALL' ? 502 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    testId,
    status: result.overallStatus,
    totalQuestions: result.passed + result.failed + result.reviewNeeded,
    passed: result.passed,
    failed: result.failed,
    reviewNeeded: result.reviewNeeded,
    validationSummary: result.validationSummary,
    validationMs: result.validationMs,
    /** How many questions were sent to AI (incremental: may be < totalQuestions). */
    questionsValidated: result.questionsValidated,
    staleQuestionIds: result.staleQuestionIds,
  });
}
