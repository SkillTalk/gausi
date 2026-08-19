import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';
import type { OptionKey, AnswerSnapshot, CategoryResult } from '@/types/exam';

export const runtime = 'nodejs';

// ─── Shared validation helpers ────────────────────────────────────────────────

const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D', 'E']);

function isValidOption(v: unknown): v is OptionKey {
  return typeof v === 'string' && VALID_OPTIONS.has(v);
}

function isNullableValidOption(v: unknown): v is OptionKey | null {
  return v === null || isValidOption(v);
}

// ─── Server-side score recalculation ─────────────────────────────────────────
// Mirrors calculateResult() from src/lib/exam/scoring.ts
// Runs on server using static test data + examConfig as source of truth.

type ServerResult = {
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  optionE: number;
  unanswered: number;
  attempted: number;
  accuracy: number;
  percentage: number;
  timeUsedSeconds: number;
  answers: AnswerSnapshot[];
  topicBreakdown: CategoryResult[];
};

function recalculate(
  testId: string,
  rawAnswers: Record<string, OptionKey | null>,
  startedAt: Date,
  submittedAt: Date
): ServerResult | { error: string } {
  // Find test by ID across all registered tests
  const test = Object.values(tre4TestsBySlug).find((t) => t.id === testId);
  if (!test) return { error: `Test not found: ${testId}` };

  const { config, questions } = test;
  const { marks } = config;

  // Validate all provided question IDs exist in this test
  const knownIds = new Set(questions.map((q) => q.id));
  for (const qid of Object.keys(rawAnswers)) {
    if (!knownIds.has(qid)) return { error: `Unknown questionId: ${qid}` };
  }

  const answers: AnswerSnapshot[] = questions.map((q) => {
    const selected = rawAnswers[q.id] ?? null;

    let status: AnswerSnapshot['status'];
    let marksAwarded: number;

    if (selected === null) {
      status = 'unanswered';
      marksAwarded = marks.unanswered;
    } else if (selected === 'E') {
      status = 'optionE';
      marksAwarded = marks.optionE;
    } else if (selected === q.correctOption) {
      status = 'correct';
      marksAwarded = marks.correct;
    } else {
      status = 'wrong';
      marksAwarded = marks.wrong;
    }

    return {
      questionId: q.id,
      selectedOption: selected,
      correctOption: q.correctOption,
      status,
      marksAwarded,
    };
  });

  const correct = answers.filter((a) => a.status === 'correct').length;
  const wrong = answers.filter((a) => a.status === 'wrong').length;
  const optionE = answers.filter((a) => a.status === 'optionE').length;
  const unanswered = answers.filter((a) => a.status === 'unanswered').length;
  const attempted = correct + wrong + optionE;

  const rawScore = answers.reduce((s, a) => s + a.marksAwarded, 0);
  const score = Math.round(rawScore * 100) / 100;
  const maxScore = config.totalQuestions * marks.correct;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0;
  const percentage = Math.round((score / maxScore) * 1000) / 10;

  // Duration cap — same logic as client
  const durationMs = config.durationMinutes * 60 * 1000;
  const elapsedMs = submittedAt.getTime() - startedAt.getTime();
  const timeUsedSeconds = Math.round(Math.min(elapsedMs, durationMs) / 1000);

  // Category breakdown
  const catMap = new Map<string, CategoryResult>();
  for (const a of answers) {
    const cat = (questions.find((q) => q.id === a.questionId)?.category) ?? 'General';
    if (!catMap.has(cat)) {
      catMap.set(cat, { category: cat, total: 0, correct: 0, wrong: 0, optionE: 0, unanswered: 0 });
    }
    const c = catMap.get(cat)!;
    c.total++;
    if (a.status === 'correct') c.correct++;
    else if (a.status === 'wrong') c.wrong++;
    else if (a.status === 'optionE') c.optionE++;
    else c.unanswered++;
  }

  return {
    score,
    maxScore,
    correct,
    wrong,
    optionE,
    unanswered,
    attempted,
    accuracy,
    percentage,
    timeUsedSeconds,
    answers,
    topicBreakdown: Array.from(catMap.values()),
  };
}

// ─── POST /api/attempts ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 32_768) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  // Required field checks
  const required = ['userId', 'testId', 'testSlug', 'language', 'startedAt', 'submittedAt', 'submissionReason', 'answers', 'idempotencyKey'];
  for (const field of required) {
    if (!(field in b)) {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
    }
  }

  if (typeof b.userId !== 'string' || !b.userId) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }
  if (typeof b.testId !== 'string' || !b.testId) {
    return NextResponse.json({ error: 'Invalid testId' }, { status: 400 });
  }
  if (typeof b.testSlug !== 'string' || !b.testSlug) {
    return NextResponse.json({ error: 'Invalid testSlug' }, { status: 400 });
  }
  if (typeof b.language !== 'string') {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }
  if (typeof b.idempotencyKey !== 'string' || b.idempotencyKey.length < 8 || b.idempotencyKey.length > 64) {
    return NextResponse.json({ error: 'Invalid idempotencyKey' }, { status: 400 });
  }

  const startedAt = new Date(b.startedAt as string);
  const submittedAt = new Date(b.submittedAt as string);
  if (isNaN(startedAt.getTime()) || isNaN(submittedAt.getTime())) {
    return NextResponse.json({ error: 'Invalid timestamps' }, { status: 400 });
  }
  if (submittedAt <= startedAt) {
    return NextResponse.json({ error: 'submittedAt must be after startedAt' }, { status: 400 });
  }

  // Validate answers map
  const rawAnswers = b.answers;
  if (typeof rawAnswers !== 'object' || rawAnswers === null || Array.isArray(rawAnswers)) {
    return NextResponse.json({ error: 'answers must be an object' }, { status: 400 });
  }
  const answersMap = rawAnswers as Record<string, unknown>;
  for (const [qid, opt] of Object.entries(answersMap)) {
    if (typeof qid !== 'string') return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 });
    if (!isNullableValidOption(opt)) {
      return NextResponse.json({ error: `Invalid option for ${qid}: ${String(opt)}` }, { status: 400 });
    }
  }

  const cleanAnswers = answersMap as Record<string, OptionKey | null>;

  // Check userId exists
  const user = await db.user.findUnique({ where: { id: b.userId }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Find test metadata
  const test = Object.values(tre4TestsBySlug).find((t) => t.id === b.testId);
  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  // Server-side score recalculation
  const result = recalculate(b.testId, cleanAnswers, startedAt, submittedAt);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  const submissionReason = typeof b.submissionReason === 'string' ? b.submissionReason : 'manual';

  try {
    // Idempotency: if same key exists, return the existing attempt (no duplicate)
    const existing = await db.testAttempt.findUnique({
      where: { idempotencyKey: b.idempotencyKey as string },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id, idempotent: true }, { status: 200 });
    }

    const attempt = await db.testAttempt.create({
      data: {
        userId: b.userId,
        testId: test.id,
        testSlug: test.slug,
        testTitle: test.title,
        subject: test.subject ?? null,
        topic: test.topicId ?? null,
        language: b.language as string,
        startedAt,
        submittedAt,
        submissionReason,
        timeUsedSeconds: result.timeUsedSeconds,
        score: result.score,
        maxScore: result.maxScore,
        correct: result.correct,
        wrong: result.wrong,
        optionE: result.optionE,
        unanswered: result.unanswered,
        attempted: result.attempted,
        accuracy: result.accuracy,
        percentage: result.percentage,
        answers: result.answers,
        topicBreakdown: result.topicBreakdown,
        idempotencyKey: b.idempotencyKey as string,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: attempt.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/attempts] DB error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── GET /api/attempts?userId=... ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const rows = await db.testAttempt.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        testId: true,
        testSlug: true,
        testTitle: true,
        subject: true,
        topic: true,
        language: true,
        startedAt: true,
        submittedAt: true,
        submissionReason: true,
        timeUsedSeconds: true,
        score: true,
        maxScore: true,
        correct: true,
        wrong: true,
        optionE: true,
        unanswered: true,
        attempted: true,
        accuracy: true,
        percentage: true,
        topicBreakdown: true,
        createdAt: true,
      },
    });

    // Compute attemptNumber per user+test (1-based, oldest = 1)
    const testCounters: Record<string, number> = {};
    // rows are newest-first; reverse to assign numbers oldest-first
    const withNumbers = [...rows].reverse().map((r) => {
      const key = r.testId;
      testCounters[key] = (testCounters[key] ?? 0) + 1;
      return { ...r, attemptNumber: testCounters[key] };
    });
    // Return newest-first again
    withNumbers.reverse();

    return NextResponse.json(withNumbers, { status: 200 });
  } catch (err) {
    console.error('[GET /api/attempts] DB error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
