/**
 * GET /api/tests/[slug]
 *
 * Public endpoint: look up a test by slug.
 * Returns the ExamTest shape (static or DB-published) for use by client pages.
 *
 * Static tests are always returned (no DB needed).
 * DB tests: only PUBLISHED tests are returned; others yield 404.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getTestBySlug } from '@/lib/test-provider';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;

  try {
    const test = await getTestBySlug(slug);
    if (!test) {
      return NextResponse.json({ test: null }, { status: 404 });
    }
    return NextResponse.json({ test });
  } catch (err) {
    console.error(`[GET /api/tests/${slug}]`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load test.' }, { status: 500 });
  }
}
