/**
 * POST /api/admin/subject-tests/generate
 *
 * Supports two formats:
 *
 * FULL_SUBJECT_TEST (default)
 *   - Exactly 80 questions, 80 marks, 80 minutes (recommended practice duration)
 *   - All questions strictly from the selected subject
 *   - Server enforces totalQuestions=80 and durationMinutes=80 regardless of client input
 *   - topicAdherenceMode: STRICT (always)
 *   - Uses 4-batch generation (4 × 20Q) via subject-test-generation.service.ts
 *
 * CUSTOM_PRACTICE
 *   - 1–200 questions, 5–180 minutes — admin-specified
 *   - Same behaviour as the existing /api/admin/tests/generate route
 *   - Uses single-call generation via generation.service.ts
 *
 * Protected by admin middleware (same as all /api/admin/* routes).
 */
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateTest } from '@/lib/admin/generation.service';
import { generateSubjectTest } from '@/lib/admin/subject-test-generation.service';
import { tre4SubjectsByCategory } from '@/content/exams/tre4/subjects';
import { SUBJECT_SERIES_CATEGORIES } from '@/content/exams/tre4/subjects';
import type { GenerateTestInput, GeneratedDifficulty } from '@/types/generated-test';
import type { SubjectTestInput } from '@/lib/admin/subject-test-generation.service';

// ─── Shared constants ─────────────────────────────────────────────────────────

export type SubjectTestFormat = 'FULL_SUBJECT_TEST' | 'CUSTOM_PRACTICE';
const VALID_FORMATS: SubjectTestFormat[] = ['FULL_SUBJECT_TEST', 'CUSTOM_PRACTICE'];
const VALID_DIFFS: GeneratedDifficulty[] = ['Beginner', 'Easy', 'Moderate', 'Hard', 'Very Hard', 'Mixed'];

// ─── Validators ───────────────────────────────────────────────────────────────

type ValidationOk<T> = { valid: true; data: T };
type ValidationErr = { valid: false; error: string };
type Validated<T> = ValidationOk<T> | ValidationErr;

/** Fields common to both formats (required, type-checked). */
function parseCommonFields(b: Record<string, unknown>): Validated<{
  exam: 'BPSC TRE 4';
  category: string;
  topic: string;
  difficulty: GeneratedDifficulty;
  format: SubjectTestFormat;
}> {
  if (b.exam !== 'BPSC TRE 4') return { valid: false, error: 'Only BPSC TRE 4 is supported.' };

  const category = typeof b.category === 'string' ? b.category.trim() : '';
  if (!SUBJECT_SERIES_CATEGORIES.includes(category)) {
    return { valid: false, error: `category must be one of: ${SUBJECT_SERIES_CATEGORIES.join(', ')}` };
  }

  const topic = typeof b.topic === 'string' ? b.topic.trim() : '';
  if (!topic) return { valid: false, error: 'topic is required.' };

  const difficulty = typeof b.difficulty === 'string' ? b.difficulty.trim() : '';
  if (!(VALID_DIFFS as string[]).includes(difficulty)) {
    return { valid: false, error: `difficulty must be one of: ${VALID_DIFFS.join(', ')}` };
  }

  // Default to FULL_SUBJECT_TEST when not supplied
  const rawFormat = typeof b.testFormat === 'string' ? b.testFormat.trim() : 'FULL_SUBJECT_TEST';
  if (!(VALID_FORMATS as string[]).includes(rawFormat)) {
    return { valid: false, error: `testFormat must be FULL_SUBJECT_TEST or CUSTOM_PRACTICE.` };
  }

  return {
    valid: true,
    data: {
      exam: 'BPSC TRE 4',
      category,
      topic,
      difficulty: difficulty as GeneratedDifficulty,
      format: rawFormat as SubjectTestFormat,
    },
  };
}

function validateFullSubjectInput(b: Record<string, unknown>): Validated<SubjectTestInput> {
  const common = parseCommonFields(b);
  if (!common.valid) return common;
  const { category, topic, difficulty } = common.data;

  const subjectInfo = tre4SubjectsByCategory[category];
  // subjectInfo is guaranteed because category already passed SUBJECT_SERIES_CATEGORIES check
  const subjectLabel = subjectInfo?.label ?? category;

  // Server enforces 80Q and 80min — client values for these are silently ignored
  return {
    valid: true,
    data: { exam: 'BPSC TRE 4', category, subjectLabel, topic, difficulty },
  };
}

function validateCustomPracticeInput(b: Record<string, unknown>): Validated<GenerateTestInput> {
  const common = parseCommonFields(b);
  if (!common.valid) return common;
  const { exam, category, topic, difficulty } = common.data;

  const totalQuestions = Number(b.totalQuestions);
  if (!Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions > 200) {
    return { valid: false, error: 'totalQuestions must be 1–200 for CUSTOM_PRACTICE.' };
  }

  const durationMinutes = Number(b.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) {
    return { valid: false, error: 'durationMinutes must be 5–180 for CUSTOM_PRACTICE.' };
  }

  return {
    valid: true,
    data: {
      exam,
      category,
      topic,
      difficulty,
      totalQuestions,
      durationMinutes,
      topicAdherenceMode: 'NORMAL',
    },
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

  if (!rawBody || typeof rawBody !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const b = rawBody as Record<string, unknown>;

  // Determine format first (default: FULL_SUBJECT_TEST)
  const rawFormat = typeof b.testFormat === 'string' ? b.testFormat.trim() : 'FULL_SUBJECT_TEST';

  if (rawFormat === 'FULL_SUBJECT_TEST') {
    // ── Full Subject Test: 80Q, 80min, STRICT scope ──────────────────────────
    const validation = validateFullSubjectInput(b);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { data: input } = validation;

    console.log(
      `[SUBJECT-GENERATE] FULL_SUBJECT_TEST | subject="${input.category}" | topic="${input.topic}" | diff="${input.difficulty}" | 80Q×80min`,
    );

    const result = await generateSubjectTest(input, apiKey);

    if (!result.ok) {
      console.error(`[SUBJECT-GENERATE] failed | stage=${result.stage} | ${result.error}`);
      const httpStatus = result.stage === 'AI_CALL' ? 502 : 500;
      return NextResponse.json({ error: result.error }, { status: httpStatus });
    }

    console.log(`[SUBJECT-GENERATE] FULL success | testId=${result.testId} | ${result.generationMs}ms`);
    return NextResponse.json({
      testId: result.testId,
      status: 'GENERATED',
      slug: result.slug,
      format: 'FULL_SUBJECT_TEST',
      totalQuestions: 80,
      generationMs: result.generationMs,
    });
  }

  if (rawFormat === 'CUSTOM_PRACTICE') {
    // ── Custom Practice: 1–200Q, admin-specified, existing behaviour ─────────
    const validation = validateCustomPracticeInput(b);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { data: input } = validation;

    console.log(
      `[SUBJECT-GENERATE] CUSTOM_PRACTICE | category="${input.category}" | q=${input.totalQuestions} | diff="${input.difficulty}"`,
    );

    const result = await generateTest(input, apiKey);

    if (!result.ok) {
      console.error(`[SUBJECT-GENERATE] custom failed | stage=${result.stage} | ${result.error}`);
      const httpStatus = result.stage === 'AI_CALL' ? 502 : 500;
      return NextResponse.json({ error: result.error }, { status: httpStatus });
    }

    console.log(`[SUBJECT-GENERATE] CUSTOM success | testId=${result.testId} | ${result.generationMs}ms`);
    return NextResponse.json({
      testId: result.testId,
      status: 'GENERATED',
      slug: result.slug,
      format: 'CUSTOM_PRACTICE',
      totalQuestions: input.totalQuestions,
      generationMs: result.generationMs,
    });
  }

  return NextResponse.json({ error: 'Invalid testFormat.' }, { status: 400 });
}
