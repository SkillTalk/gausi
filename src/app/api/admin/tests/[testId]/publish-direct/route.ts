/**
 * POST /api/admin/tests/[testId]/publish-direct
 *
 * Publish a test immediately without requiring validation.
 * Allowed from GENERATED, VALIDATION_FAILED, READY, or SCHEDULED status.
 *
 * Use when you trust the generated content and want to skip the validation step.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { publishTestDirect } from '@/lib/admin/publish.service';

type Params = { params: Promise<{ testId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { testId } = await params;

  const result = await publishTestDirect(testId);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.httpStatus ?? 500 });
  }

  return NextResponse.json({
    status: 'PUBLISHED',
    publishedAt: result.data?.publishedAt?.toISOString(),
  });
}
