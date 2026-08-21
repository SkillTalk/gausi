'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
    }
  }

  return (
    <button
      onClick={() => { void handleLogout(); }}
      disabled={loading}
      className="text-xs font-semibold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? 'Logging out…' : 'Logout'}
    </button>
  );
}
