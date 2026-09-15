/**
 * Generation Service — Agent 1 core logic extracted for reuse by Agent 4.
 *
 * The generate route delegates to this module.
 * The automation service calls this directly (no HTTP round-trip).
 *
 * Server-only. Never import in client components.
 */

import { db } from '@/lib/db';
import { validateAIOutput } from '@/lib/admin/question-validator';
import { buildSystemPrompt, buildUserPrompt, buildCustomBatchUserPrompt } from '@/lib/admin/generator-prompt';
import { generateTestSlug } from '@/lib/admin/slug-generator';
import { mapAIQuestionToDBRow } from '@/lib/admin/question-mapper';
import type { AIGenerationResult, AIQuestion, GenerateTestInput } from '@/types/generated-test';

const OPENAI_MODEL = 'gpt-4o';

// ─── Result types ─────────────────────────────────────────────────────────────

export type GenerationSuccess = {
  ok: true;
  testId: string;
  slug: string;
  generationMs: number;
};

export type GenerationError = {
  ok: false;
  error: string;
  stage: 'SETUP' | 'AI_CALL' | 'DB_WRITE';
};

export type GenerationResult = GenerationSuccess | GenerationError;

// ─── Core generation function ─────────────────────────────────────────────────

export async function generateTest(
  input: GenerateTestInput,
  apiKey: string,
): Promise<GenerationResult> {
  const reqStart = Date.now();
  // Short correlation prefix for log correlation across stages
  const corrId = `gen-${Date.now().toString(36)}`;

  // 1. Create GENERATING record
  const slug = generateTestSlug(input.category, input.topic);
  let testId: string;

  try {
    const created = await db.generatedTest.create({
      data: {
        exam: input.exam,
        category: input.category,
        topic: input.topic,
        slug,
        titleHi: `${input.topic} — अभ्यास प्रश्नपत्र`,
        titleEn: `${input.topic} — Practice Paper`,
        difficulty: input.difficulty,
        totalQuestions: input.totalQuestions,
        durationMinutes: input.durationMinutes,
        status: 'GENERATING',
        plannedPublishAt: input.plannedPublishAt ? new Date(input.plannedPublishAt) : null,
        generationSource: 'openai',
        generationModel: OPENAI_MODEL,
        strictTopicScope: input.strictTopicScope ?? null,
        excludeScope: input.excludeScope ?? null,
        topicAdherenceMode: input.topicAdherenceMode ?? 'STRICT',
      },
    });
    testId = created.id;
    console.log(`[${corrId}:${testId}] SETUP done | +${Date.now() - reqStart}ms`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB create failed';
    console.error(`[${corrId}] SETUP failed | +${Date.now() - reqStart}ms | ${msg}`);
    return { ok: false, error: `Failed to create test record: ${msg}`, stage: 'SETUP' };
  }

  const startMs = Date.now();

  // 2. Call OpenAI
  console.log(
    `[${corrId}:${testId}] AI_GENERATION start | model=${OPENAI_MODEL} | max_tokens=16000 | q=${input.totalQuestions} | diff=${input.difficulty}`,
  );
  let aiResult: AIGenerationResult;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(input.topicAdherenceMode ?? 'STRICT') },
          { role: 'user', content: buildUserPrompt(input) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI returned ${response.status}: ${errText.slice(0, 200)}`);
    }

    type OAResp = { choices: Array<{ message: { content: string } }> };
    const data = await response.json() as OAResp;
    const raw = data.choices?.[0]?.message?.content ?? '';
    const aiElapsed = Date.now() - startMs;
    console.log(`[${corrId}:${testId}] AI_GENERATION done | +${aiElapsed}ms | rawLen=${raw.length}`);
    try {
      aiResult = JSON.parse(raw) as AIGenerationResult;
      console.log(`[${corrId}:${testId}] AI_RESPONSE_PARSE ok | +${Date.now() - reqStart}ms`);
    } catch {
      console.error(`[${corrId}:${testId}] AI_RESPONSE_PARSE failed | +${Date.now() - reqStart}ms | invalid JSON`);
      throw new Error('OpenAI returned invalid JSON.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI call failed';
    console.error(`[${corrId}:${testId}] AI_GENERATION failed | +${Date.now() - reqStart}ms | ${msg}`);
    await markFailed(testId, msg);
    return { ok: false, error: msg, stage: 'AI_CALL' };
  }

  const generationMs = Date.now() - startMs;

  // 3. Validate AI output schema
  const structVal = validateAIOutput(aiResult, input.totalQuestions);
  if (!structVal.valid) {
    const errMsg = structVal.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    console.error(`[${corrId}:${testId}] AI_RESPONSE_PARSE schema-invalid | +${Date.now() - reqStart}ms | ${errMsg}`);
    await markFailed(testId, `Schema validation failed: ${errMsg}`);
    return { ok: false, error: `AI output schema validation failed: ${errMsg}`, stage: 'AI_CALL' };
  }

  // 4. Save questions — use createMany (single INSERT) + sequential update to avoid
  //    interactive-transaction timeout on Neon (default 5 s is too short for 25 rows).
  try {
    await db.generatedQuestion.createMany({
      // mapAIQuestionToDBRow is the shared pure mapper from question-mapper.ts.
      // Same fields, same trimming, same Option E enforcement — no behaviour change.
      data: (aiResult.questions as AIQuestion[]).map((q) => mapAIQuestionToDBRow(q, testId)),
    });

    await db.generatedTest.update({
      where: { id: testId },
      data: {
        titleHi: aiResult.titleHi.trim(),
        // Keep AI-generated English title but do NOT overwrite topic — topic = admin input, canonical
        titleEn: aiResult.titleEn.trim(),
        status: 'GENERATED',
        generationMs,
        errorMessage: null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB write failed';
    console.error(`[${corrId}:${testId}] DATABASE_SAVE failed | +${Date.now() - reqStart}ms | ${msg}`);
    await db.generatedQuestion.deleteMany({ where: { testId } }).catch(() => {});
    await markFailed(testId, `DB write failed: ${msg}`);
    return { ok: false, error: `Failed to save questions: ${msg}`, stage: 'DB_WRITE' };
  }

  console.log(`[${corrId}:${testId}] DATABASE_SAVE ok | ✅ ${input.totalQuestions}q | "${input.topic}" | total=${Date.now() - reqStart}ms (ai=${generationMs}ms)`);
  return { ok: true, testId, slug, generationMs };
}

// ─── Batched generation for CUSTOM_PRACTICE > 25Q ────────────────────────────

const CUSTOM_BATCH_SIZE = 25;

/**
 * Generate a CUSTOM_PRACTICE test using multiple batches of ≤25 questions each.
 *
 * Avoids OpenAI token limits and Cloudflare 524 timeouts that occur when
 * requesting >25 questions in a single API call.
 *
 * - Each batch asks for CUSTOM_BATCH_SIZE (or fewer for the last batch) questions.
 * - Prior questions are passed as dedup context so OpenAI doesn't repeat them.
 * - All questions are saved atomically via a single Prisma transaction.
 * - The optional onBatchComplete callback lets the route stream progress to the client.
 */
export async function generateTestBatched(
  input: GenerateTestInput,
  apiKey: string,
  opts?: { onBatchComplete?: (batchNum: number, totalSoFar: number) => void },
): Promise<GenerationResult> {
  const reqStart = Date.now();
  const corrId = `gen-b-${Date.now().toString(36)}`;

  const totalBatches = Math.ceil(input.totalQuestions / CUSTOM_BATCH_SIZE);
  const slug = generateTestSlug(input.category, input.topic);

  // 1. Create GENERATING record
  let testId: string;
  let savedTitleHi = `${input.topic} — अभ्यास प्रश्नपत्र`;
  let savedTitleEn = `${input.topic} — Practice Paper`;

  try {
    const created = await db.generatedTest.create({
      data: {
        exam: input.exam,
        category: input.category,
        topic: input.topic,
        slug,
        titleHi: savedTitleHi,
        titleEn: savedTitleEn,
        difficulty: input.difficulty,
        totalQuestions: input.totalQuestions,
        durationMinutes: input.durationMinutes,
        status: 'GENERATING',
        plannedPublishAt: input.plannedPublishAt ? new Date(input.plannedPublishAt) : null,
        generationSource: 'openai',
        generationModel: OPENAI_MODEL,
        strictTopicScope: input.strictTopicScope ?? null,
        excludeScope: input.excludeScope ?? null,
        topicAdherenceMode: input.topicAdherenceMode ?? 'NORMAL',
      },
    });
    testId = created.id;
    console.log(`[${corrId}:${testId}] SETUP done | batches=${totalBatches} | q=${input.totalQuestions} | +${Date.now() - reqStart}ms`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB create failed';
    return { ok: false, error: `Failed to create test record: ${msg}`, stage: 'SETUP' };
  }

  // 2. Run batches sequentially
  const allQuestions: AIQuestion[] = [];
  const aiStart = Date.now();

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchNum = batchIdx + 1;
    const orderStart = batchIdx * CUSTOM_BATCH_SIZE + 1;
    const remaining = input.totalQuestions - allQuestions.length;
    const batchSize = Math.min(CUSTOM_BATCH_SIZE, remaining);
    const orderEnd = orderStart + batchSize - 1;

    console.log(`[${corrId}:${testId}] BATCH_${batchNum}/${totalBatches} start | orders=${orderStart}–${orderEnd} | +${Date.now() - reqStart}ms`);

    const batchPrompt = buildCustomBatchUserPrompt(
      batchNum,
      totalBatches,
      batchSize,
      input,
      allQuestions.map((q) => ({ questionEn: q.questionEn })),
    );

    let aiResult: AIGenerationResult;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: buildSystemPrompt(input.topicAdherenceMode ?? 'NORMAL') },
            { role: 'user', content: batchPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 16000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI ${response.status}: ${errText.slice(0, 200)}`);
      }

      type OAResp = { choices: Array<{ message: { content: string } }> };
      const data = await response.json() as OAResp;
      const raw = data.choices?.[0]?.message?.content ?? '';
      aiResult = JSON.parse(raw) as AIGenerationResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI call failed';
      console.error(`[${corrId}:${testId}] BATCH_${batchNum} failed | ${msg}`);
      await markFailed(testId, `Batch ${batchNum} failed: ${msg}`);
      return { ok: false, error: `Batch ${batchNum} failed: ${msg}`, stage: 'AI_CALL' };
    }

    // Validate batch output schema
    const structVal = validateAIOutput(aiResult, batchSize);
    if (!structVal.valid) {
      const errMsg = structVal.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      console.error(`[${corrId}:${testId}] BATCH_${batchNum} schema invalid | ${errMsg}`);
      await markFailed(testId, `Batch ${batchNum} schema invalid: ${errMsg}`);
      return { ok: false, error: `Batch ${batchNum} schema validation failed: ${errMsg}`, stage: 'AI_CALL' };
    }

    // Remap order numbers to the global range (orderStart … orderEnd)
    const batchQuestions = (aiResult.questions as AIQuestion[]).map((q, localIdx) => ({
      ...q,
      order: orderStart + localIdx,
    }));
    allQuestions.push(...batchQuestions);

    // Capture title from the first batch
    if (batchNum === 1) {
      savedTitleHi = aiResult.titleHi?.trim() || savedTitleHi;
      savedTitleEn = aiResult.titleEn?.trim() || savedTitleEn;
    }

    console.log(`[${corrId}:${testId}] BATCH_${batchNum}/${totalBatches} done | cumulative=${allQuestions.length}Q | +${Date.now() - reqStart}ms`);
    opts?.onBatchComplete?.(batchNum, allQuestions.length);
  }

  const generationMs = Date.now() - aiStart;

  // 3. Atomic transaction: save all questions + update status to GENERATED
  try {
    const sortedRows = allQuestions
      .sort((a, b) => a.order - b.order)
      .map((q, idx) => mapAIQuestionToDBRow(q, testId, idx + 1));

    await db.$transaction(async (tx) => {
      await tx.generatedQuestion.createMany({ data: sortedRows });
      await tx.generatedTest.update({
        where: { id: testId },
        data: { titleHi: savedTitleHi, titleEn: savedTitleEn, status: 'GENERATED', generationMs, errorMessage: null },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB write failed';
    console.error(`[${corrId}:${testId}] DB_WRITE failed | ${msg}`);
    await markFailed(testId, `DB write failed: ${msg}`);
    return { ok: false, error: `Failed to save questions: ${msg}`, stage: 'DB_WRITE' };
  }

  console.log(`[${corrId}:${testId}] DONE ✅ | ${input.totalQuestions}Q in ${totalBatches} batches | total=${Date.now() - reqStart}ms`);
  return { ok: true, testId, slug, generationMs };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function markFailed(testId: string, errorMessage: string) {
  await db.generatedTest
    .update({ where: { id: testId }, data: { status: 'DRAFT', errorMessage } })
    .catch(() => {});
}
