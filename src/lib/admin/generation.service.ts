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
import { buildSystemPrompt, buildUserPrompt } from '@/lib/admin/generator-prompt';
import { generateTestSlug } from '@/lib/admin/slug-generator';
import type { AIGenerationResult, AIQuestion, GenerateTestInput } from '@/types/generated-test';

const OPENAI_MODEL = 'gpt-4o';
const OPTION_E_HI = 'उत्तर नहीं देना चाहता';
const OPTION_E_EN = 'I do not want to answer';

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB create failed';
    console.error('[GEN_SVC] Failed to create test record:', msg);
    return { ok: false, error: `Failed to create test record: ${msg}`, stage: 'SETUP' };
  }

  const startMs = Date.now();

  // 2. Call OpenAI
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
    try {
      aiResult = JSON.parse(raw) as AIGenerationResult;
    } catch {
      throw new Error('OpenAI returned invalid JSON.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI call failed';
    console.error(`[GEN_SVC:${testId}] OpenAI failure:`, msg);
    await markFailed(testId, msg);
    return { ok: false, error: msg, stage: 'AI_CALL' };
  }

  const generationMs = Date.now() - startMs;

  // 3. Validate AI output schema
  const structVal = validateAIOutput(aiResult, input.totalQuestions);
  if (!structVal.valid) {
    const errMsg = structVal.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    console.error(`[GEN_SVC:${testId}] Structural validation failed:`, errMsg);
    await markFailed(testId, `Schema validation failed: ${errMsg}`);
    return { ok: false, error: `AI output schema validation failed: ${errMsg}`, stage: 'AI_CALL' };
  }

  // 4. Save questions — use createMany (single INSERT) + sequential update to avoid
  //    interactive-transaction timeout on Neon (default 5 s is too short for 25 rows).
  try {
    await db.generatedQuestion.createMany({
      data: (aiResult.questions as AIQuestion[]).map((q) => ({
        testId,
        order: q.order,
        category: q.category.trim(),
        topic: q.topic.trim(),
        difficulty: q.difficulty.trim(),
        questionType: q.questionType?.trim() ?? 'DIRECT',
        questionHi: q.questionHi.trim(),
        optionAHi: q.optionAHi.trim(),
        optionBHi: q.optionBHi.trim(),
        optionCHi: q.optionCHi.trim(),
        optionDHi: q.optionDHi.trim(),
        optionEHi: OPTION_E_HI,
        explanationHi: q.explanationHi.trim(),
        questionEn: q.questionEn.trim(),
        optionAEn: q.optionAEn.trim(),
        optionBEn: q.optionBEn.trim(),
        optionCEn: q.optionCEn.trim(),
        optionDEn: q.optionDEn.trim(),
        optionEEn: OPTION_E_EN,
        explanationEn: q.explanationEn.trim(),
        correctOption: q.correctOption.trim().toUpperCase(),
      })),
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
    console.error(`[GEN_SVC:${testId}] DB write failed:`, msg);
    await db.generatedQuestion.deleteMany({ where: { testId } }).catch(() => {});
    await markFailed(testId, `DB write failed: ${msg}`);
    return { ok: false, error: `Failed to save questions: ${msg}`, stage: 'DB_WRITE' };
  }

  console.log(`[GEN_SVC:${testId}] ✅ ${input.totalQuestions}q | "${input.topic}" | ${generationMs}ms`);
  return { ok: true, testId, slug, generationMs };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function markFailed(testId: string, errorMessage: string) {
  await db.generatedTest
    .update({ where: { id: testId }, data: { status: 'DRAFT', errorMessage } })
    .catch(() => {});
}
