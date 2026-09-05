/**
 * POST /api/admin/tests/generate
 *
 * Agent 1 — Question Generator.
 * Delegates to generation.service.ts for core logic.
 */
export const runtime = 'nodejs';
// gpt-4o bilingual generation for 25 Very Hard questions can take 60–90 s.
// maxDuration must be set explicitly; without it the platform default may be
// lower for older projects or non-fluid-compute deployments.
export const maxDuration = 300;

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
  console.log(
    `[GENERATE] REQUEST_VALIDATION passed | topic="${input.topic}" | q=${input.totalQuestions} | diff=${input.difficulty} | mode=${input.topicAdherenceMode ?? 'STRICT'}`,
  );

  const result = await generateTest(input, apiKey);

  if (!result.ok) {
    console.error(`[GENERATE] failed | stage=${result.stage} | ${result.error}`);
    const httpStatus = result.stage === 'AI_CALL' ? 502 : 500;
    return NextResponse.json({ error: result.error }, { status: httpStatus });
  }

  console.log(`[GENERATE] success | testId=${result.testId} | ${result.generationMs}ms`);
  return NextResponse.json({
    testId: result.testId,
    status: 'GENERATED',
    slug: result.slug,
    totalQuestions: input.totalQuestions,
    generationMs: result.generationMs,
  });
}
