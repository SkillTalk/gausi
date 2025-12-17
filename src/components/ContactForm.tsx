"use client";
import { useState } from 'react';
import { validateContact } from '@/lib/validators';
import { Button } from '@/components/Button';
// (motion utilities removed in this component to keep types lean)

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', service: '', message: '' });
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateContact({
      name: form.name,
      email: form.email,
      phone: form.phone,
      service: form.service,
      message: form.message
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setStatus({ ok: res.ok, msg: data.message || (res.ok ? 'Message sent.' : 'Something went wrong.') });
      if (res.ok) setForm({ name: '', email: '', phone: '', service: '', message: '' });
    } catch (error) {
      console.error('[CONTACT FORM ERROR]', error);
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
        <div>
          <label className="text-sm text-white/80">Phone</label>
          <input
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-electric-600"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-white/80">Service</label>
          <select
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-electric-600"
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
          >
            <option value="">Select service</option>
            <option value="SEO">SEO</option>
            <option value="Local SEO">Local SEO</option>
            <option value="Content Strategy">Content Strategy</option>
            <option value="Social Media">Social Media</option>
            <option value="Google Ads">Google Ads</option>
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="text-sm text-white/80">Message</label>
        <textarea
          className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-electric-600"
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
        {errors.message && <p className="text-sm text-red-400 mt-1">{errors.message}</p>}
      </div>
      <div className="mt-5">
        <div className="inline-block">
          <Button type="submit">{loading ? 'Sending…' : 'Send Message'}</Button>
        </div>
      </div>
      {status && (
        <p className={`mt-3 text-sm ${status.ok ? 'text-emerald-400' : 'text-red-400'}`}>{status.msg}</p>
      )}
    </form>
  );
}


