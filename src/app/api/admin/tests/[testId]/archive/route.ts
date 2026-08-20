/**
 * POST /api/admin/tests/[testId]/archive
 *
 * Archive a PUBLISHED test.
 * PUBLISHED → ARCHIVED
 *
 * Archived tests are hidden from public listings but
 * historical user attempts remain intact.
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { archiveTest } from '@/lib/admin/publish.service';

type Params = { params: Promise<{ testId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { testId } = await params;

  const result = await archiveTest(testId);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.httpStatus });
  }

  return NextResponse.json({ status: 'ARCHIVED' });
}
