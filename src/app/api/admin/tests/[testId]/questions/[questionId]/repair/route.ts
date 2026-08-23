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
import { repairQuestion, type RepairMode, type AdminQuestionSeed } from '@/lib/admin/repair.service';

const VALID_REPAIR_MODES: RepairMode[] = ['AUTO_FIX', 'REPLACE', 'MANUAL', 'ADMIN_SEED'];

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

  // Guard: instruction length limit.
  // MANUAL mode passes full question JSON (no AI call) — allow up to 8000 chars.
  // AUTO_FIX / REPLACE / ADMIN_SEED pass a human hint — limit to 1000 chars.
  const maxInstructionLength = repairMode === 'MANUAL' ? 8000 : 1000;
  if (instruction && instruction.length > maxInstructionLength) {
    return NextResponse.json(
      { error: `instruction must be ${maxInstructionLength} characters or fewer for ${repairMode} mode.` },
      { status: 400 },
    );
  }

  // Parse adminQuestion for ADMIN_SEED mode
  let adminQuestion: AdminQuestionSeed | null = null;
  if (repairMode === 'ADMIN_SEED') {
    const raw = b.adminQuestion;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const q = raw as Record<string, unknown>;
      adminQuestion = {
        questionText: typeof q.questionText === 'string' ? q.questionText.trim() : undefined,
        questionHi:   typeof q.questionHi   === 'string' ? q.questionHi.trim()   : undefined,
        questionEn:   typeof q.questionEn   === 'string' ? q.questionEn.trim()   : undefined,
        optionA:      typeof q.optionA      === 'string' ? q.optionA.trim()      : undefined,
        optionB:      typeof q.optionB      === 'string' ? q.optionB.trim()      : undefined,
        optionC:      typeof q.optionC      === 'string' ? q.optionC.trim()      : undefined,
        optionD:      typeof q.optionD      === 'string' ? q.optionD.trim()      : undefined,
        correctOption:typeof q.correctOption=== 'string' ? q.correctOption.trim().toUpperCase() : undefined,
        explanation:  typeof q.explanation  === 'string' ? q.explanation.trim()  : undefined,
        questionType: typeof q.questionType === 'string' ? q.questionType.trim() : undefined,
      };
    } else {
      return NextResponse.json(
        { error: 'ADMIN_SEED mode requires an adminQuestion object with at least questionText, questionEn, or questionHi.' },
        { status: 400 },
      );
    }
  }

  const result = await repairQuestion(
    testId,
    questionId,
    repairMode as RepairMode,
    instruction,
    apiKey,
    adminQuestion,
  );

  if (!result.ok) {
    const status =
      result.stage === 'LOAD' ? 404 :
      result.stage === 'STATUS_CHECK' ? (result.error.includes('immutable') || result.error.includes('PASS') ? 409 : 422) :
      result.stage === 'STRUCT_CHECK' ? 422 :
      result.stage === 'MANUAL_PARSE' ? 400 :
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
