// Test Provider — maps PUBLISHED GeneratedTest rows to the ExamTest type
// used by the exam engine. Both static and DB tests produce identical ExamTest shapes.
//
// This module is server-only. Never import it in client components.
// Use GET /api/tests/[slug] for client-side test loading.

import { db } from '@/lib/db';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';
import { TRE4_MARKS } from '@/content/exams/tre4/config';
import type { ExamTest, ExamConfig, Question, CorrectOptionKey, OptionKey } from '@/types/exam';

// ─── Difficulty mapping ───────────────────────────────────────────────────────
function mapDifficulty(d: string): 'Beginner' | 'Intermediate' | 'Advanced' {
  if (d === 'Beginner' || d === 'Easy') return 'Beginner';
  if (d === 'Hard' || d === 'Very Hard') return 'Advanced';
  return 'Intermediate'; // Moderate, Mixed
}

// ─── Slug helper ─────────────────────────────────────────────────────────────
function toTopicId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── DB row shape (from Prisma query) ────────────────────────────────────────
type DbTestRow = {
  id: string;
  exam: string;
  category: string;
  topic: string;
  slug: string;
  titleHi: string;
  titleEn: string;
  difficulty: string;
  totalQuestions: number;
  durationMinutes: number;
  publishedAt: Date | null;
  createdAt: Date;
  questions: Array<{
    id: string;
    order: number;
    category: string;
    questionHi: string;
    optionAHi: string;
    optionBHi: string;
    optionCHi: string;
    optionDHi: string;
    optionEHi: string;
    explanationHi: string;
    questionEn: string;
    optionAEn: string;
    optionBEn: string;
    optionCEn: string;
    optionDEn: string;
    optionEEn: string;
    explanationEn: string;
    correctOption: string;
  }>;
};

// ─── Mapper: DB row → ExamTest ───────────────────────────────────────────────
export function dbTestToExamTest(row: DbTestRow): ExamTest {
  const date = row.publishedAt?.toISOString().slice(0, 10) ?? row.createdAt.toISOString().slice(0, 10);

  const config: ExamConfig = {
    examId: 'bpsc-tre4',
    examName: 'BPSC TRE 4',
    totalQuestions: row.totalQuestions,
    durationMinutes: row.durationMinutes,
    marks: TRE4_MARKS,
  };

  const questions: Question[] = row.questions.map((q) => ({
    id: q.id,
    category: q.category,
    correctOption: q.correctOption as CorrectOptionKey,
    hi: {
      question: q.questionHi,
      options: {
        A: q.optionAHi,
        B: q.optionBHi,
        C: q.optionCHi,
        D: q.optionDHi,
        E: q.optionEHi,
      } as Record<OptionKey, string>,
      explanation: q.explanationHi,
    },
    en: {
      question: q.questionEn,
      options: {
        A: q.optionAEn,
        B: q.optionBEn,
        C: q.optionCEn,
        D: q.optionDEn,
        E: q.optionEEn,
      } as Record<OptionKey, string>,
      explanation: q.explanationEn,
    },
  }));

  return {
    id: row.id, // raw cuid — no prefix needed, no clash with "tre4-" static IDs
    slug: row.slug,
    date,
    title: row.titleEn,
    titleHi: row.titleHi,
    subject: row.category,
    subjectHi: row.category, // English fallback; bilingual category names are in the questions
    topicId: toTopicId(row.topic),
    difficulty: mapDifficulty(row.difficulty),
    config,
    questions,
  };
}

// ─── Look up a test by slug (static first, then PUBLISHED DB) ────────────────
export async function getTestBySlug(slug: string): Promise<ExamTest | null> {
  // Static tests are always available without DB call
  const staticTest = tre4TestsBySlug[slug];
  if (staticTest) return staticTest;

  // Look up in DB — only PUBLISHED tests are visible to students
  const row = await db.generatedTest.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!row) return null;
  return dbTestToExamTest(row);
}

// ─── Look up a test by ID (static first, then PUBLISHED DB) ──────────────────
// Used by the scoring route to validate attempts server-side.
export async function getTestById(testId: string): Promise<ExamTest | null> {
  // Static tests use human-readable IDs like "tre4-2026-08-19-1857"
  const staticTest = Object.values(tre4TestsBySlug).find((t) => t.id === testId);
  if (staticTest) return staticTest;

  // DB tests use cuid IDs
  const row = await db.generatedTest.findFirst({
    where: { id: testId, status: 'PUBLISHED' },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!row) return null;
  return dbTestToExamTest(row);
}

// ─── Get all PUBLISHED DB tests (for daily/category listing) ─────────────────
export type PublishedTestSummary = {
  id: string;
  slug: string;
  date: string;
  title: string;
  titleHi: string;
  subject: string;
  topicId: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  totalQuestions: number;
  durationMinutes: number;
  publishedAt: string;
};

export async function getPublishedDbTests(
  filters: { category?: string; exam?: string } = {},
): Promise<PublishedTestSummary[]> {
  const rows = await db.generatedTest.findMany({
    where: {
      status: 'PUBLISHED',
      ...(filters.exam ? { exam: filters.exam } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      titleHi: true,
      titleEn: true,
      category: true,
      topic: true,
      difficulty: true,
      totalQuestions: true,
      durationMinutes: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    date: r.publishedAt?.toISOString().slice(0, 10) ?? r.createdAt.toISOString().slice(0, 10),
    title: r.titleEn,
    titleHi: r.titleHi,
    subject: r.category,
    topicId: toTopicId(r.topic),
    difficulty: mapDifficulty(r.difficulty),
    totalQuestions: r.totalQuestions,
    durationMinutes: r.durationMinutes,
    publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
  }));
}
