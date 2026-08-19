import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseEmail } from '@/lib/user-identity';

export const runtime = 'nodejs';

/** POST /api/user — find or create a user by email (lightweight identity, no OTP). */
export async function POST(req: NextRequest) {
  // Body size guard
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 512) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || !('email' in body)) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const rawEmail = (body as Record<string, unknown>).email;
  if (typeof rawEmail !== 'string') {
    return NextResponse.json({ error: 'email must be a string' }, { status: 400 });
  }

  const email = parseEmail(rawEmail);
  if (!email) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 422 });
  }

  try {
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: { email },
      select: { id: true, email: true },
    });
    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    console.error('[POST /api/user] DB error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
