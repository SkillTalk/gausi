/**
 * /admin/users — User Data
 *
 * Server Component: reads the User table directly at request time.
 * Auth: the admin middleware (src/middleware.ts) protects all /admin/* routes;
 * unauthenticated requests are redirected to /admin/login before this page renders.
 */
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import Link from 'next/link';

export const metadata: Metadata = { title: 'User Data | GAUSI Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, createdAt: true },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">User Data</h1>
          <p className="mt-1 text-sm text-slate-500">
            Total Users:{' '}
            <span className="font-bold text-slate-800">{users.length}</span>
          </p>
        </div>
        <Link
          href="/admin/tests"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          ← Back to Tests
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No users have registered yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Email ID</th>
                <th className="px-4 py-3 hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 break-all">{user.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-400 text-xs whitespace-nowrap">
                    {user.createdAt.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
