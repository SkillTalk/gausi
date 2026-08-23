/**
 * Admin User Data — Tests
 *
 * Covers:
 *  1. GET /api/admin/users returns all users, newest first
 *  2. Unauthorized access is blocked (middleware behaviour — 401)
 *  3. Email addresses render correctly in the response
 *  4. Total user count matches the returned array length
 *  5. No duplicate entries appear
 *  6. Empty state handled (0 users)
 *  7. DB error returns 500
 *
 * All DB calls are mocked; no real database is used.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { db } from '@/lib/db';

// ── Mock DB ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

const mockFindMany = db.user.findMany as MockedFunction<typeof db.user.findMany>;

// ── Mock next/server so the route can be imported in Node test env ────────────

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

// Import route handler AFTER mocks are set
import { GET } from '@/app/api/admin/users/route';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<{
  id: string;
  email: string;
  createdAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? 'user-1',
    email: overrides.email ?? 'test@example.com',
    createdAt: overrides.createdAt ?? new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Returns users newest first ──────────────────────────────────────────

  it('returns users ordered newest first', async () => {
    const users = [
      makeUser({ id: 'u-2', email: 'b@example.com', createdAt: new Date('2026-08-01') }),
      makeUser({ id: 'u-1', email: 'a@example.com', createdAt: new Date('2026-01-01') }),
    ];
    mockFindMany.mockResolvedValueOnce(users);

    const res = await GET();
    const body = await res.json() as { users: { id: string; email: string }[]; total: number };

    expect(body.users[0].email).toBe('b@example.com');
    expect(body.users[1].email).toBe('a@example.com');
  });

  it('calls db.user.findMany with orderBy createdAt desc', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  // ── 2. Unauthorized access — 401 from middleware ──────────────────────────

  it('middleware config protects the route (matcher includes /api/admin/*)', async () => {
    // The actual 401 is enforced by src/middleware.ts before the handler runs.
    // We verify that the middleware matcher covers the users path.
    const { config } = await import('@/middleware');
    const matcher: string[] = Array.isArray(config.matcher) ? config.matcher : [config.matcher];
    const coversAdminApi = matcher.some(
      (m) => m.startsWith('/api/admin/') || m === '/api/admin/:path*',
    );
    expect(coversAdminApi).toBe(true);
  });

  // ── 3. Email addresses render correctly ───────────────────────────────────

  it('returns email addresses exactly as stored', async () => {
    const emails = ['alice@gmail.com', 'bob@yahoo.co.in', 'carol+tag@example.org'];
    const users = emails.map((email, i) =>
      makeUser({ id: `u-${i}`, email, createdAt: new Date() }),
    );
    mockFindMany.mockResolvedValueOnce(users);

    const res = await GET();
    const body = await res.json() as { users: { email: string }[] };

    expect(body.users.map((u) => u.email)).toEqual(emails);
  });

  // ── 4. Total count matches array length ───────────────────────────────────

  it('total equals the number of users returned', async () => {
    const users = [
      makeUser({ id: 'u-1', email: 'x@x.com' }),
      makeUser({ id: 'u-2', email: 'y@y.com' }),
      makeUser({ id: 'u-3', email: 'z@z.com' }),
    ];
    mockFindMany.mockResolvedValueOnce(users);

    const res = await GET();
    const body = await res.json() as { users: unknown[]; total: number };

    expect(body.total).toBe(3);
    expect(body.users).toHaveLength(3);
    expect(body.total).toBe(body.users.length);
  });

  // ── 5. No duplicate display ───────────────────────────────────────────────

  it('does not duplicate users — each id appears exactly once', async () => {
    const users = [
      makeUser({ id: 'u-1', email: 'alice@example.com' }),
      makeUser({ id: 'u-2', email: 'bob@example.com' }),
    ];
    mockFindMany.mockResolvedValueOnce(users);

    const res = await GET();
    const body = await res.json() as { users: { id: string }[] };
    const ids = body.users.map((u) => u.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('db.user.findMany is called exactly once per request', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  // ── 6. Empty state ────────────────────────────────────────────────────────

  it('returns empty array and total 0 when no users exist', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const res = await GET();
    const body = await res.json() as { users: unknown[]; total: number };

    expect(res.status).toBe(200);
    expect(body.users).toEqual([]);
    expect(body.total).toBe(0);
  });

  // ── 7. DB error → 500 ────────────────────────────────────────────────────

  it('returns 500 when the database throws', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('DB connection failed'));

    const res = await GET();
    const body = await res.json() as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/failed/i);
  });

  // ── 8. Response shape ─────────────────────────────────────────────────────

  it('response includes id, email, and createdAt for each user', async () => {
    const dt = new Date('2026-08-15T09:00:00Z');
    mockFindMany.mockResolvedValueOnce([makeUser({ id: 'u-1', email: 'a@b.com', createdAt: dt })]);

    const res = await GET();
    const body = await res.json() as { users: { id: string; email: string; createdAt: string }[] };

    expect(body.users[0]).toMatchObject({
      id: 'u-1',
      email: 'a@b.com',
      createdAt: dt.toISOString(),
    });
  });

  // ── 9. Selects only id, email, createdAt (no password or sensitive fields) ─

  it('selects only id, email, createdAt — no extra sensitive fields', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, email: true, createdAt: true },
      }),
    );
  });
});
