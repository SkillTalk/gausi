"use client";
import { useState } from 'react';
import { validateAudit } from '@/lib/validators';
import { Button } from '@/components/Button';

export function FreeAuditForm() {
  const [form, setForm] = useState({ name: '', email: '', website: '', goals: '' });
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateAudit({
      name: form.name,
      email: form.email,
      website: form.website,
      goals: form.goals
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setStatus({ ok: res.ok, msg: data.message || (res.ok ? 'Request submitted.' : 'Something went wrong.') });
      if (res.ok) setForm({ name: '', email: '', website: '', goals: '' });
    } catch {
      setStatus({ ok: false, msg: 'Network error.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 md:col-span-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-white/80">Name</label>
          <input
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-electric-600"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          {errors.name && <p className="text-sm text-red-400 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="text-sm text-white/80">Email</label>
          <input
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-electric-600"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          {errors.email && <p className="text-sm text-red-400 mt-1">{errors.email}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-white/80">Website</label>
          <input
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-electric-600"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            required
          />
          {errors.website && <p className="text-sm text-red-400 mt-1">{errors.website}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-white/80">Goals (optional)</label>
          <textarea
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-electric-600"
            rows={4}
            value={form.goals}
            onChange={(e) => setForm({ ...form, goals: e.target.value })}
          />
        </div>
      </div>
      <div className="mt-5">
        <Button type="submit">{loading ? 'Submitting…' : 'Request Audit'}</Button>
      </div>
      {status && (
        <p className={`mt-3 text-sm ${status.ok ? 'text-emerald-400' : 'text-red-400'}`}>{status.msg}</p>
      )}
    </form>
  );
}


