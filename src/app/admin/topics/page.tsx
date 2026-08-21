'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExamTopic = {
  id: string;
  exam: string;
  category: string;
  topic: string;
  slug: string;
  difficultyDefault: string | null;
  questionCountDefault: number | null;
  durationMinutesDefault: number | null;
  priority: number;
  cooldownDays: number;
  notes: string | null;
  enabled: boolean;
  status: string;
  lastUsedAt: string | null;
  timesUsed: number;
  createdAt: string;
};

type Stats = { activeCount: number; usedThisMonth: number; categoryCount: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMS = ['BPSC TRE 4'];
const CATEGORIES = [
  'History', 'Geography', 'General Science', 'General Awareness',
  'Mathematics', 'Mental Ability', 'Social Science', 'Environment',
];
const DIFFICULTIES = ['Beginner', 'Easy', 'Moderate', 'Hard', 'Mixed'];

function priorityLabel(p: number): string {
  if (p >= 80) return 'High';
  if (p >= 30) return 'Normal';
  return 'Low';
}
function priorityColor(p: number): string {
  if (p >= 80) return 'text-red-600 font-bold';
  if (p >= 30) return 'text-slate-700';
  return 'text-slate-400';
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-800',
  PAUSED:    'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  ARCHIVED:  'bg-slate-100 text-slate-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── AddTopicForm ─────────────────────────────────────────────────────────────

function AddTopicForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    exam: 'BPSC TRE 4',
    category: 'History',
    topic: '',
    priority: 50,
    difficultyDefault: '',
    questionCountDefault: '',
    durationMinutesDefault: '',
    notes: '',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          questionCountDefault: form.questionCountDefault ? parseInt(form.questionCountDefault) : null,
          durationMinutesDefault: form.durationMinutesDefault ? parseInt(form.durationMinutesDefault) : null,
          difficultyDefault: form.difficultyDefault || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed to create topic.'); return; }
      onSuccess();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h3 className="font-bold text-slate-800 text-sm">Add Topic</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Exam</label>
          <select value={form.exam} onChange={(e) => set('exam', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {EXAMS.map((ex) => <option key={ex}>{ex}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Category *</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Topic *</label>
          <input required value={form.topic} onChange={(e) => set('topic', e.target.value)}
            placeholder="e.g. Revolt of 1857"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
          <select value={form.priority} onChange={(e) => set('priority', parseInt(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value={100}>High (100)</option>
            <option value={50}>Normal (50)</option>
            <option value={10}>Low (10)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Difficulty</label>
          <select value={form.difficultyDefault} onChange={(e) => set('difficultyDefault', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Use config default</option>
            {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Questions</label>
          <input type="number" min={5} max={100} value={form.questionCountDefault}
            onChange={(e) => set('questionCountDefault', e.target.value)}
            placeholder="Default"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Duration (min)</label>
          <input type="number" min={5} max={180} value={form.durationMinutesDefault}
            onChange={(e) => set('durationMinutesDefault', e.target.value)}
            placeholder="Default"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)}
            className="h-4 w-4 rounded" />
          Enabled
        </label>
        <input value={form.notes} onChange={(e) => set('notes', e.target.value)}
          placeholder="Notes (optional)"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving || !form.topic.trim()}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Topic'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── BulkImportPanel ──────────────────────────────────────────────────────────

function BulkImportPanel({ onSuccess }: { onSuccess: () => void }) {
  const [text, setText] = useState('');
  const [exam, setExam] = useState('BPSC TRE 4');
  const [preview, setPreview] = useState<{ category: string; topic: string; priority: number }[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: { row: string; reason: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    setError(null);
    setResult(null);
    const res = await fetch('/api/admin/topics/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam, text, preview: true }),
    });
    const data = await res.json() as { rows?: typeof preview; error?: string };
    if (!res.ok) { setError(data.error ?? 'Error'); return; }
    setPreview(data.rows ?? []);
  }

  async function handleImport() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/topics/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam, text }),
      });
      const data = await res.json() as typeof result & { error?: string };
      if (!res.ok) { setError(data.error ?? 'Error'); return; }
      setResult(data);
      setPreview([]);
      setText('');
      onSuccess();
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <select value={exam} onChange={(e) => setExam(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          {EXAMS.map((ex) => <option key={ex}>{ex}</option>)}
        </select>
        <span className="text-xs text-slate-500">Format: <code className="bg-slate-100 px-1 rounded">Category | Topic</code> or <code className="bg-slate-100 px-1 rounded">Category | Topic | Priority</code></span>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8}
        placeholder={`History | Revolt of 1857\nHistory | Battle of Plassey\nGeography | Indian Rivers | 100\nScience | Photosynthesis`}
        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono" />
      {error && <p className="text-red-600 text-xs">{error}</p>}
      {preview.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">{preview.length} rows ready to import:</p>
          <div className="max-h-40 overflow-y-auto text-xs border rounded-lg divide-y">
            {preview.map((r, i) => (
              <div key={i} className="px-3 py-1.5 flex gap-3">
                <span className="text-slate-400 w-20">{r.category}</span>
                <span className="text-slate-700">{r.topic}</span>
                <span className="text-slate-400 ml-auto">p={r.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {result && (
        <div className="text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="font-semibold text-green-700">Import complete: {result.created} created, {result.skipped} skipped</p>
          {result.errors.length > 0 && <p className="text-red-600 text-xs mt-1">{result.errors.length} errors</p>}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => { void handlePreview(); }} disabled={!text.trim()}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">
          Preview
        </button>
        <button onClick={() => { void handleImport(); }} disabled={loading || !text.trim()}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
          {loading ? 'Importing…' : 'Import'}
        </button>
      </div>
    </div>
  );
}

// ─── NextTopicPanel ───────────────────────────────────────────────────────────

function NextTopicPanel({ exam, allowRepeat }: { exam: string; allowRepeat: boolean }) {
  const [next, setNext] = useState<ExamTopic | null | undefined>(undefined);
  const [topicMode, setTopicMode] = useState<string>('MANUAL');
  const [loading, setLoading] = useState(false);
  const [usingTopic, setUsingTopic] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/topics/next?exam=${encodeURIComponent(exam)}&allowRepeat=${allowRepeat}`);
      const data = await res.json() as { topic?: ExamTopic | null; configTopicMode?: string };
      setNext(data.topic ?? null);
      setTopicMode(data.configTopicMode ?? 'MANUAL');
    } finally { setLoading(false); }
  }, [exam, allowRepeat]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleUseForNext() {
    if (!next) return;
    setUsingTopic(true);
    try {
      await fetch('/api/admin/automation/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicMode: 'QUEUE' }),
      });
    } finally { setUsingTopic(false); }
  }

  if (loading || next === undefined) {
    return <div className="h-20 bg-slate-50 border border-slate-200 rounded-xl animate-pulse" />;
  }

  return (
    <div className="bg-gradient-to-br from-brand-50 to-slate-50 border border-brand-100 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-slate-800 text-sm">Next Suggested Topic</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${topicMode === 'QUEUE' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
            Auto Select: {topicMode === 'QUEUE' ? 'ON' : 'OFF'}
          </span>
          <button onClick={() => { void refresh(); }}
            className="text-xs text-slate-400 hover:text-slate-600">↻</button>
        </div>
      </div>

      {next ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">Exam</p>
              <p className="font-semibold text-slate-800">{next.exam}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="font-semibold text-slate-800">{next.category}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Topic</p>
              <p className="font-bold text-brand-700">{next.topic}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Priority</p>
              <p className={`font-semibold ${priorityColor(next.priority)}`}>{priorityLabel(next.priority)} ({next.priority})</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Last Used: {fmtDate(next.lastUsedAt)} · Times Used: {next.timesUsed}</p>

          {topicMode !== 'QUEUE' && (
            <button onClick={() => { void handleUseForNext(); }} disabled={usingTopic}
              className="mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold disabled:opacity-50">
              {usingTopic ? 'Switching…' : 'Enable Queue Mode (Use This Automatically)'}
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-500 py-2">
          No eligible topic found. Add topics or adjust cooldown settings.
        </div>
      )}
    </div>
  );
}

// ─── TopicRow ─────────────────────────────────────────────────────────────────

function TopicRow({ t, onAction }: {
  t: ExamTopic;
  onAction: (id: string, action: 'pause' | 'resume' | 'archive') => void;
}) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{t.category}</td>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">{t.topic}</p>
        {t.notes && <p className="text-xs text-slate-400 mt-0.5">{t.notes}</p>}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={priorityColor(t.priority)}>{priorityLabel(t.priority)}</span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(t.lastUsedAt)}</td>
      <td className="px-4 py-3 text-sm text-slate-600 text-center">{t.timesUsed}</td>
      <td className="px-4 py-3">
        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[t.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {t.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {t.status === 'ACTIVE' && (
            <button onClick={() => onAction(t.id, 'pause')}
              className="text-xs text-amber-600 hover:text-amber-800 font-medium px-2 py-0.5 border border-amber-200 hover:border-amber-400 rounded">
              Pause
            </button>
          )}
          {t.status === 'PAUSED' && (
            <button onClick={() => onAction(t.id, 'resume')}
              className="text-xs text-green-600 hover:text-green-800 font-medium px-2 py-0.5 border border-green-200 hover:border-green-400 rounded">
              Resume
            </button>
          )}
          {t.status !== 'ARCHIVED' && (
            <button onClick={() => onAction(t.id, 'archive')}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-0.5 border border-slate-200 hover:border-slate-400 rounded">
              Archive
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<ExamTopic[]>([]);
  const [stats, setStats] = useState<Stats>({ activeCount: 0, usedThisMonth: 0, categoryCount: 0 });
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const exam = 'BPSC TRE 4';

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ exam });
      if (filterCategory) params.set('category', filterCategory);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/topics?${params}`);
      const data = await res.json() as { topics?: ExamTopic[]; stats?: Stats };
      setTopics(data.topics ?? []);
      setStats(data.stats ?? { activeCount: 0, usedThisMonth: 0, categoryCount: 0 });
    } finally { setLoading(false); }
  }, [filterCategory, filterStatus, exam]);

  useEffect(() => { void fetchTopics(); }, [fetchTopics]);

  async function handleAction(id: string, action: 'pause' | 'resume' | 'archive') {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/topics/${id}/${action}`, { method: 'POST' });
      await fetchTopics();
    } finally { setActionLoading(null); }
  }

  const filtered = topics.filter((t) => {
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Topic Planner</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage the syllabus queue for Agent 4 daily automation</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/automation"
            className="text-xs border border-slate-300 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50">
            ← Automation
          </Link>
          <button onClick={() => { setShowBulk((v) => !v); setShowAddForm(false); }}
            className="text-xs border border-brand-300 text-brand-700 px-3 py-2 rounded-lg hover:bg-brand-50">
            Bulk Import
          </button>
          <button onClick={() => { setShowAddForm((v) => !v); setShowBulk(false); }}
            className="text-xs bg-brand-600 text-white px-3 py-2 rounded-lg hover:bg-brand-700 font-semibold">
            + Add Topic
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Topics', value: stats.activeCount, color: 'text-green-700' },
          { label: 'Used This Month', value: stats.usedThisMonth, color: 'text-brand-700' },
          { label: 'Categories', value: stats.categoryCount, color: 'text-slate-700' },
          { label: 'Total in List', value: topics.length, color: 'text-slate-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Next Suggested Topic */}
      <NextTopicPanel exam={exam} allowRepeat={false} />

      {/* Add Topic Form */}
      {showAddForm && (
        <AddTopicForm
          onSuccess={() => { setShowAddForm(false); void fetchTopics(); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Bulk Import */}
      {showBulk && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">Bulk Import Topics</h3>
          <BulkImportPanel onSuccess={() => { setShowBulk(false); void fetchTopics(); }} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs font-semibold text-slate-500">Filter:</span>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <span className="text-xs text-slate-400">{filtered.length} topic{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Topic Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Loading topics…</div>
        ) : filtered.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
            <p>No topics found.</p>
            <button onClick={() => setShowAddForm(true)}
              className="text-xs text-brand-600 hover:underline">Add your first topic →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500">Topic</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500">Priority</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500">Last Used</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Times Used</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <TopicRow
                    key={t.id}
                    t={t}
                    onAction={(id, action) => {
                      if (actionLoading) return;
                      void handleAction(id, action);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
