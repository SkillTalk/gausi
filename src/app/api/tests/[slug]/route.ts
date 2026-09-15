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
// Do NOT force-dynamic — we set explicit Cache-Control headers below.
// Static tests never change; DB tests are soft-cached for 60 s.

import { NextResponse } from 'next/server';
import { getTestBySlug } from '@/lib/test-provider';
import { tre4TestsBySlug } from '@/content/exams/tre4/tests';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;

  try {
    const test = await getTestBySlug(slug);
    if (!test) {
      return NextResponse.json({ test: null }, { status: 404 });
    }

    // Static tests never change — cache aggressively at CDN + browser.
    // DB (generated) tests are published but can be archived; cache briefly.
    const isStatic = slug in tre4TestsBySlug;
    const cacheHeader = isStatic
      ? 'public, max-age=3600, stale-while-revalidate=86400'   // 1 h fresh, 24 h stale
      : 'public, s-maxage=60, stale-while-revalidate=30';       // 60 s at CDN, 30 s stale

    return NextResponse.json({ test }, {
      headers: { 'Cache-Control': cacheHeader },
    });
  } catch (err) {
    console.error(`[GET /api/tests/${slug}]`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load test.' }, { status: 500 });
  }
}
