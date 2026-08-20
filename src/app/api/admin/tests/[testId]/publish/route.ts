/**
 * POST /api/admin/tests/[testId]/publish
 *
 * Agent 3 — Publish a READY or SCHEDULED test immediately.
 * Enforces all eligibility guards server-side (validation, staleness).
 * Only READY and SCHEDULED tests may be published.
 * Archived / PUBLISHED / GENERATED tests are rejected.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { publishTest } from '@/lib/admin/publish.service';

type Params = { params: Promise<{ testId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { testId } = await params;

  const result = await publishTest(testId);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.httpStatus });
  }

  return NextResponse.json({
    status: 'PUBLISHED',
    publishedAt: result.data?.publishedAt?.toISOString(),
  });
}
