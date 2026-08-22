/**
 * POST /api/admin/tests/[testId]/questions/[questionId]/repair
 *
 * Single-question repair endpoint.
 * Protected by Next.js middleware (admin session cookie required).
 *
 * Request body:
 *   { repairMode: "AUTO_FIX" | "REPLACE" | "MANUAL", instruction?: string }
 *
 * Response 200:
 *   { questionId, repairLogId, repairedQuestion, message }
 *
 * Response 4xx/5xx:
 *   { error: string }
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { repairQuestion, type RepairMode } from '@/lib/admin/repair.service';

const VALID_REPAIR_MODES: RepairMode[] = ['AUTO_FIX', 'REPLACE', 'MANUAL'];

type Params = { params: Promise<{ testId: string; questionId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { testId, questionId } = await params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured.' },
      { status: 503 },
    );
  }

  // Parse + validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const repairMode = b.repairMode as string | undefined;
  if (!repairMode || !VALID_REPAIR_MODES.includes(repairMode as RepairMode)) {
    return NextResponse.json(
      { error: `repairMode must be one of: ${VALID_REPAIR_MODES.join(', ')}` },
      { status: 400 },
    );
  }

  const instruction =
    typeof b.instruction === 'string' && b.instruction.trim()
      ? b.instruction.trim()
      : undefined;

  // Guard: instruction must not be absurdly long
  if (instruction && instruction.length > 500) {
    return NextResponse.json(
      { error: 'instruction must be 500 characters or fewer.' },
      { status: 400 },
    );
  }

  const result = await repairQuestion(
    testId,
    questionId,
    repairMode as RepairMode,
    instruction,
    apiKey,
  );

  if (!result.ok) {
    const status =
      result.stage === 'LOAD' ? 404 :
      result.stage === 'STATUS_CHECK' ? (result.error.includes('immutable') || result.error.includes('PASS') ? 409 : 422) :
      result.stage === 'STRUCT_CHECK' ? 422 :
      result.stage === 'AI_CALL' ? 502 : 500;

    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    questionId: result.questionId,
    repairLogId: result.repairLogId,
    repairedQuestion: result.repairedQuestion,
    message: 'Question repaired successfully. Revalidation required before publishing.',
  });
}
