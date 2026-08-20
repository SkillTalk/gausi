/**
 * POST /api/admin/tests/[testId]/regenerate
 *
 * Deletes all existing questions for the test, re-calls OpenAI with the
 * same parameters, and saves fresh questions.
 * Requires explicit confirmation in the request body: { "confirm": true }
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAIOutput } from '@/lib/admin/question-validator';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/admin/generator-prompt';
import type { AIGenerationResult, AIQuestion, GenerateTestInput } from '@/types/generated-test';

const OPENAI_MODEL = 'gpt-4o';
const OPTION_E_HI = 'उत्तर नहीं देना चाहता';
const OPTION_E_EN = 'I do not want to answer';

type Params = { params: Promise<{ testId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { testId } = await params;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.confirm) {
    return NextResponse.json(
      { error: 'Regeneration requires { "confirm": true } in the request body.' },
      { status: 400 }
    );
  }

  // Load existing test config
  const test = await db.generatedTest.findUnique({ where: { id: testId } });
  if (!test) {
    return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
  }

  if (!['DRAFT', 'GENERATED', 'VALIDATION_FAILED'].includes(test.status)) {
    return NextResponse.json(
      { error: `Cannot regenerate a test with status ${test.status}.` },
      { status: 409 }
    );
  }

  // Mark as GENERATING and wipe old questions
  await db.$transaction([
    db.generatedTest.update({
      where: { id: testId },
      data: { status: 'GENERATING', errorMessage: null },
    }),
    db.generatedQuestion.deleteMany({ where: { testId } }),
  ]);

  const input: GenerateTestInput = {
    exam: test.exam as GenerateTestInput['exam'],
    category: test.category,
    topic: test.topic,
    difficulty: test.difficulty as GenerateTestInput['difficulty'],
    totalQuestions: test.totalQuestions,
    durationMinutes: test.durationMinutes,
    plannedPublishAt: test.plannedPublishAt?.toISOString(),
  };

  const startMs = Date.now();
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

    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);

    type OAResp = { choices: Array<{ message: { content: string } }> };
    const data = await response.json() as OAResp;
    aiResult = JSON.parse(data.choices[0].message.content) as AIGenerationResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI call failed.';
    await db.generatedTest.update({
      where: { id: testId },
      data: { status: 'DRAFT', errorMessage: msg },
    }).catch(() => {});
    return NextResponse.json({ error: 'AI regeneration failed.', detail: msg }, { status: 502 });
  }

  const generationMs = Date.now() - startMs;

  const structValidation = validateAIOutput(aiResult, input.totalQuestions);
  if (!structValidation.valid) {
    const errMsg = structValidation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    await db.generatedTest.update({
      where: { id: testId },
      data: { status: 'DRAFT', errorMessage: `Schema validation failed: ${errMsg}` },
    }).catch(() => {});
    return NextResponse.json({ error: 'AI output failed validation.', details: structValidation.errors }, { status: 422 });
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.generatedTest.update({
        where: { id: testId },
        data: {
          titleHi: aiResult.titleHi.trim(),
          titleEn: aiResult.titleEn.trim(),
          status: 'GENERATED',
          generationMs,
          generationModel: OPENAI_MODEL,
          errorMessage: null,
        },
      });

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
    await db.generatedQuestion.deleteMany({ where: { testId } }).catch(() => {});
    await db.generatedTest.update({
      where: { id: testId },
      data: { status: 'DRAFT', errorMessage: `DB write failed: ${msg}` },
    }).catch(() => {});
    return NextResponse.json({ error: 'Failed to save regenerated questions.' }, { status: 500 });
  }

  console.log(`[REGENERATE:${testId}] ✅ Regenerated ${input.totalQuestions}q | ${generationMs}ms`);
  return NextResponse.json({ testId, status: 'GENERATED', generationMs });
}
