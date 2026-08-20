/**
 * POST /api/admin/tests/generate
 *
 * Agent 1 — Question Generator.
 * Validates input → creates DB record (GENERATING) → calls OpenAI →
 * validates AI output → saves questions → marks GENERATED.
 * On any failure: marks DRAFT, deletes partial questions, returns clean error.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateGenerateInput, sanitizeInput } from '@/lib/admin/admin-validator';
import { validateAIOutput } from '@/lib/admin/question-validator';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/admin/generator-prompt';
import { generateTestSlug } from '@/lib/admin/slug-generator';
import type { AIGenerationResult, AIQuestion } from '@/types/generated-test';

const OPENAI_MODEL = 'gpt-4o';
const OPTION_E_HI = 'उत्तर नहीं देना चाहता';
const OPTION_E_EN = 'I do not want to answer';

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured.' },
      { status: 503 }
    );
  }

  // ─── 1. Parse + validate input ────────────────────────────────────────────
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

  // ─── 2. Create test record with GENERATING status ─────────────────────────
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
      },
    });
    testId = created.id;
  } catch (err) {
    console.error('[GENERATE] Failed to create test record:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to create test record.' }, { status: 500 });
  }

  const startMs = Date.now();

  // ─── 3. Call OpenAI ───────────────────────────────────────────────────────
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
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(input) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[GENERATE:${testId}] OpenAI error ${response.status}:`, errText.slice(0, 200));
      throw new Error(`OpenAI returned ${response.status}`);
    }

    type OpenAIResp = { choices: Array<{ message: { content: string } }> };
    const data = await response.json() as OpenAIResp;
    const raw = data.choices?.[0]?.message?.content ?? '';

    try {
      aiResult = JSON.parse(raw) as AIGenerationResult;
    } catch {
      throw new Error('OpenAI returned invalid JSON.');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI call failed.';
    console.error(`[GENERATE:${testId}] OpenAI failure:`, msg);
    await markFailed(testId, msg);
    return NextResponse.json({ error: 'AI generation failed.', detail: msg }, { status: 502 });
  }

  const generationMs = Date.now() - startMs;

  // ─── 4. Validate AI output schema ─────────────────────────────────────────
  const structValidation = validateAIOutput(aiResult, input.totalQuestions);
  if (!structValidation.valid) {
    const errMsg = structValidation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    console.error(`[GENERATE:${testId}] Structural validation failed:`, errMsg);
    await markFailed(testId, `Schema validation failed: ${errMsg}`);
    return NextResponse.json(
      { error: 'AI output failed validation.', details: structValidation.errors },
      { status: 422 }
    );
  }

  // ─── 5. Save all questions + update test in a transaction ─────────────────
  try {
    await db.$transaction(async (tx) => {
      // Update titles from AI output
      await tx.generatedTest.update({
        where: { id: testId },
        data: {
          titleHi: aiResult.titleHi.trim(),
          titleEn: aiResult.titleEn.trim(),
          status: 'GENERATED',
          generationMs,
          errorMessage: null,
        },
      });

      // Insert all questions
      for (const q of aiResult.questions as AIQuestion[]) {
        await tx.generatedQuestion.create({
          data: {
            testId,
            order: q.order,
            category: q.category.trim(),
            topic: q.topic.trim(),
            difficulty: q.difficulty.trim(),
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
          },
        });
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB write failed.';
    console.error(`[GENERATE:${testId}] Transaction failed:`, msg);
    // Clean up any partial questions
    await db.generatedQuestion.deleteMany({ where: { testId } }).catch(() => {});
    await markFailed(testId, `DB write failed: ${msg}`);
    return NextResponse.json({ error: 'Failed to save generated questions.' }, { status: 500 });
  }

  console.log(
    `[GENERATE:${testId}] ✅ Generated ${input.totalQuestions}q | topic="${input.topic}" | model=${OPENAI_MODEL} | ${generationMs}ms`
  );

  return NextResponse.json({
    testId,
    status: 'GENERATED',
    slug,
    totalQuestions: input.totalQuestions,
    generationMs,
  });
}

async function markFailed(testId: string, errorMessage: string) {
  await db.generatedTest.update({
    where: { id: testId },
    data: { status: 'DRAFT', errorMessage },
  }).catch(() => {});
}
