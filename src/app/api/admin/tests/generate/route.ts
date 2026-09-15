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
import { generateTest, generateTestBatched } from '@/lib/admin/generation.service';

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

  // ≤ 25Q: single OpenAI call — fast, plain JSON response.
  if (input.totalQuestions <= 25) {
    const result = await generateTest(input, apiKey);
    if (!result.ok) {
      console.error(`[GENERATE] failed | stage=${result.stage} | ${result.error}`);
      return NextResponse.json({ error: result.error }, { status: result.stage === 'AI_CALL' ? 502 : 500 });
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

  // > 25Q: multi-batch streaming to avoid Cloudflare 524 timeout.
  const totalBatches = Math.ceil(input.totalQuestions / 25);
  console.log(`[GENERATE] batched | q=${input.totalQuestions} | batches=${totalBatches}`);

  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const send = (obj: Record<string, unknown>) =>
    writer.write(encoder.encode(JSON.stringify(obj) + '\n'));

  void (async () => {
    try {
      await send({ stage: 'starting', totalBatches });

      const result = await generateTestBatched(input, apiKey, {
        onBatchComplete: (batchNum, totalQuestions) => {
          void send({ stage: 'batch_complete', batch: batchNum, totalBatches, totalQuestions });
        },
      });

      if (!result.ok) {
        console.error(`[GENERATE] batched failed | stage=${result.stage} | ${result.error}`);
        await send({ stage: 'error', error: result.error, errorStage: result.stage });
      } else {
        console.log(`[GENERATE] batched success | testId=${result.testId} | ${result.generationMs}ms`);
        await send({
          stage: 'done',
          testId: result.testId,
          status: 'GENERATED',
          slug: result.slug,
          totalQuestions: input.totalQuestions,
          generationMs: result.generationMs,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error';
      await send({ stage: 'error', error: msg });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
