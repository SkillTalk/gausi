/**
 * GET /api/admin/users
 *
 * Returns a list of registered users (email + id + createdAt), newest first.
 * Protected by middleware — unauthenticated requests receive 401 before this
 * handler is ever reached.
 *
 * Response:
 *   { users: [{ id, email, createdAt }], total: number }
 *
 * Email addresses are NEVER returned through any public endpoint.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string; // ISO-8601
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
  total: number;
};

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, createdAt: true },
    });

    const rows: AdminUserRow[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({ users: rows, total: rows.length } satisfies AdminUsersResponse);
  } catch (err) {
    console.error('[admin/users] DB error:', err);
    return NextResponse.json({ error: 'Failed to load users.' }, { status: 500 });
  }
}
