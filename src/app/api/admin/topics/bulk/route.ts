export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { parseBulkPaste, bulkImportTopics } from '@/lib/admin/topic-planner.service';

/**
 * POST /api/admin/topics/bulk
 *
 * Body: { exam: string, text: string, preview?: boolean }
 * text format (one per line): "Category | Topic" or "Category | Topic | Priority"
 *
 * If preview=true: returns parsed rows without inserting.
 * If preview=false (default): inserts all rows.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const exam = typeof b.exam === 'string' ? b.exam.trim() : 'BPSC TRE 4';
  const text = typeof b.text === 'string' ? b.text : '';
  const preview = b.preview === true;

  if (!text.trim()) {
    return NextResponse.json({ error: 'text is required.' }, { status: 400 });
  }

  const rows = parseBulkPaste(exam, text);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid rows found. Use format: Category | Topic' }, { status: 400 });
  }

  if (preview) {
    return NextResponse.json({ rows, total: rows.length });
  }

  try {
    const result = await bulkImportTopics(rows);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('[TOPICS BULK]', err);
    return NextResponse.json({ error: 'Bulk import failed.' }, { status: 500 });
  }
}
