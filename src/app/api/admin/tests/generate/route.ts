/**
 * POST /api/admin/tests/generate
 *
 * Agent 1 — Question Generator.
 * Delegates to generation.service.ts for core logic.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { validateGenerateInput, sanitizeInput } from '@/lib/admin/admin-validator';
import { generateTest } from '@/lib/admin/generation.service';

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 503 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validation = validateGenerateInput(rawBody);
  if (!validation.valid) {
    return NextResponse.json({ error: 'Invalid input.', details: validation.errors }, { status: 400 });
  }

  const input = sanitizeInput(rawBody as Record<string, unknown>);
  const result = await generateTest(input, apiKey);

  if (!result.ok) {
    const httpStatus = result.stage === 'AI_CALL' ? 502 : result.stage === 'DB_WRITE' ? 500 : 500;
    return NextResponse.json({ error: result.error }, { status: httpStatus });
  }

  return NextResponse.json({
    testId: result.testId,
    status: 'GENERATED',
    slug: result.slug,
    totalQuestions: input.totalQuestions,
    generationMs: result.generationMs,
  });
}
