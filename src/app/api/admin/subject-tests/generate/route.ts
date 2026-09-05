/**
 * POST /api/admin/subject-tests/generate
 *
 * Subject-series test generator.
 * Same Agent 1 logic as /api/admin/tests/generate but accepts the broader
 * SUBJECT_SERIES_CATEGORIES whitelist (Music, English, CS, Hindi, Sanskrit, …)
 * instead of the narrower topic-practice category list.
 *
 * Protected by admin middleware (same as all /api/admin/* routes).
 */
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateTest } from '@/lib/admin/generation.service';
import { SUBJECT_SERIES_CATEGORIES } from '@/content/exams/tre4/subjects';
import type { GenerateTestInput } from '@/types/generated-test';

// ─── Minimal validator (mirrors admin-validator but for subject categories) ───
function validateSubjectTestInput(body: unknown): { valid: true; input: GenerateTestInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Invalid request body.' };
  const b = body as Record<string, unknown>;

  if (b.exam !== 'BPSC TRE 4') return { valid: false, error: 'Only BPSC TRE 4 is supported.' };

  const category = typeof b.category === 'string' ? b.category.trim() : '';
  if (!SUBJECT_SERIES_CATEGORIES.includes(category)) {
    return { valid: false, error: `category must be one of: ${SUBJECT_SERIES_CATEGORIES.join(', ')}` };
  }

  const topic = typeof b.topic === 'string' ? b.topic.trim() : '';
  if (!topic) return { valid: false, error: 'topic is required.' };

  const difficulty = typeof b.difficulty === 'string' ? b.difficulty.trim() : '';
  const VALID_DIFFS = ['Beginner', 'Easy', 'Moderate', 'Hard', 'Very Hard', 'Mixed'];
  if (!VALID_DIFFS.includes(difficulty)) return { valid: false, error: 'Invalid difficulty.' };

  const totalQuestions = Number(b.totalQuestions);
  if (!Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 200) {
    return { valid: false, error: 'totalQuestions must be 1–200.' };
  }

  const durationMinutes = Number(b.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) {
    return { valid: false, error: 'durationMinutes must be 5–180.' };
  }

  const plannedPublishAt = typeof b.plannedPublishAt === 'string' && b.plannedPublishAt
    ? b.plannedPublishAt
    : undefined;

  return {
    valid: true,
    input: {
      exam: 'BPSC TRE 4',
      category,
      topic,
      difficulty: difficulty as GenerateTestInput['difficulty'],
      totalQuestions,
      durationMinutes,
      plannedPublishAt,
      topicAdherenceMode: 'NORMAL', // Subject-series tests use NORMAL mode by default
      strictTopicScope: typeof b.strictTopicScope === 'string' ? b.strictTopicScope.trim() : undefined,
      excludeScope: typeof b.excludeScope === 'string' ? b.excludeScope.trim() : undefined,
    },
  };
}

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

  const validation = validateSubjectTestInput(rawBody);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { input } = validation;
  console.log(
    `[SUBJECT-GENERATE] topic="${input.topic}" | category="${input.category}" | q=${input.totalQuestions} | diff=${input.difficulty}`,
  );

  const result = await generateTest(input, apiKey);

  if (!result.ok) {
    console.error(`[SUBJECT-GENERATE] failed | stage=${result.stage} | ${result.error}`);
    const httpStatus = result.stage === 'AI_CALL' ? 502 : 500;
    return NextResponse.json({ error: result.error }, { status: httpStatus });
  }

  console.log(`[SUBJECT-GENERATE] success | testId=${result.testId} | ${result.generationMs}ms`);
  return NextResponse.json({
    testId: result.testId,
    status: 'GENERATED',
    slug: result.slug,
    totalQuestions: input.totalQuestions,
    generationMs: result.generationMs,
  });
}
