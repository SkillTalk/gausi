'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type AutomationConfig = {
  id: string;
  exam: string;
  category: string;
  topic: string;
  difficulty: string;
  totalQuestions: number;
  durationMinutes: number;
  enabled: boolean;
  autoPublish: boolean;
  allowRepeat: boolean;
  generateTime: string;
  publishTime: string;
  timezone: string;
  topicMode: string;   // "MANUAL" | "QUEUE"
  lastRunAt: string | null;
  lastRunStatus: string | null;
  nextRunAt: string | null;
};

type NextTopic = {
  id: string;
  exam: string;
  category: string;
  topic: string;
  priority: number;
  lastUsedAt: string | null;
  timesUsed: number;
  difficultyDefault: string | null;
  questionCountDefault: number | null;
  durationMinutesDefault: number | null;
};

type AutomationRun = {
  id: string;
  runKey: string;
  scheduledFor: string;
  startedAt: string | null;
  finishedAt: string | null;
  status: string;
  generatedTestId: string | null;
  generationStatus: string | null;
  validationStatus: string | null;
  publicationStatus: string | null;
  errorStage: string | null;
  errorMessage: string | null;
  generationDurationMs: number | null;
  validationDurationMs: number | null;
  topic: string | null;
  category: string | null;
  exam: string | null;
  totalQuestions: number | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMS = ['BPSC TRE 4'];
const CATEGORIES = ['History', 'Geography', 'General Science', 'General Awareness', 'Mathematics', 'Mental Ability', 'Social Science', 'Environment'];
const DIFFICULTIES = ['Beginner', 'Easy', 'Moderate', 'Hard', 'Mixed'];

const STATUS_STYLES: Record<string, string> = {
  RUNNING:          'bg-blue-100 text-blue-700 animate-pulse',
  SUCCESS:          'bg-green-100 text-green-800',
  FAILED:           'bg-red-100 text-red-700',
  HELD_FOR_REVIEW:  'bg-amber-100 text-amber-700',
  SKIPPED:          'bg-slate-100 text-slate-500',
};

const STATUS_ICONS: Record<string, string> = {
  RUNNING:         '⟳',
  SUCCESS:         '✅',
  FAILED:          '❌',
  HELD_FOR_REVIEW: '⚠️',
  SKIPPED:         '—',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {STATUS_ICONS[status] ?? ''} {status.replace('_', ' ')}
    </span>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-brand-600' : 'bg-slate-300'}`}
      aria-label={label}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function WorkflowStep({ label, active, done, failed }: { label: string; active?: boolean; done?: boolean; failed?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1`}>
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
        failed ? 'bg-red-100 border-red-400 text-red-700' :
        done   ? 'bg-green-100 border-green-400 text-green-700' :
        active ? 'bg-blue-100 border-blue-400 text-blue-700 animate-pulse' :
        'bg-slate-50 border-slate-200 text-slate-400'
      }`}>
        {failed ? '✗' : done ? '✓' : active ? '…' : '○'}
      </div>
      <span className={`text-xs font-medium ${
        failed ? 'text-red-600' :
        done   ? 'text-green-700' :
        active ? 'text-blue-700' :
        'text-slate-400'
      }`}>{label}</span>
    </div>
  );
}

function WorkflowConnector({ done }: { done?: boolean }) {
  return (
    <div className={`flex-1 h-0.5 mt-4 mx-1 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AutomationPage() {
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [runMsg, setRunMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nextTopic, setNextTopic] = useState<NextTopic | null>(null);

  // Form state mirrors config
  const [form, setForm] = useState<Omit<AutomationConfig, 'id' | 'lastRunAt' | 'lastRunStatus' | 'nextRunAt'>>({
    exam: 'BPSC TRE 4',
    category: 'History',
    topic: '',
    difficulty: 'Moderate',
    totalQuestions: 25,
    durationMinutes: 15,
    enabled: false,
    autoPublish: true,
    allowRepeat: false,
    generateTime: '04:00',
    publishTime: '05:00',
    timezone: 'Asia/Kolkata',
    topicMode: 'MANUAL',
  });

  const loadData = useCallback(async () => {
    try {
      const [cfgRes, runsRes] = await Promise.all([
        fetch('/api/admin/automation/config'),
        fetch('/api/admin/automation/runs'),
      ]);
      const cfgData = await cfgRes.json() as { config: AutomationConfig | null };
      const runsData = await runsRes.json() as { runs: AutomationRun[] };

      if (cfgData.config) {
        setConfig(cfgData.config);
        const tm = cfgData.config.topicMode ?? 'MANUAL';
        setForm({
          exam: cfgData.config.exam,
          category: cfgData.config.category,
          topic: cfgData.config.topic,
          difficulty: cfgData.config.difficulty,
          totalQuestions: cfgData.config.totalQuestions,
          durationMinutes: cfgData.config.durationMinutes,
          enabled: cfgData.config.enabled,
          autoPublish: cfgData.config.autoPublish,
          allowRepeat: cfgData.config.allowRepeat,
          generateTime: cfgData.config.generateTime,
          publishTime: cfgData.config.publishTime,
          timezone: cfgData.config.timezone,
          topicMode: tm,
        });
        // Fetch next topic preview for QUEUE mode
        if (tm === 'QUEUE') {
          const nRes = await fetch(`/api/admin/topics/next?exam=${encodeURIComponent(cfgData.config.exam)}&allowRepeat=${cfgData.config.allowRepeat}`);
          const nData = await nRes.json() as { topic?: NextTopic | null };
          setNextTopic(nData.topic ?? null);
        }
      }
      setRuns(runsData.runs ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/admin/automation/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { config?: AutomationConfig; error?: string };
      if (res.ok && data.config) {
        setConfig(data.config);
        setSaveMsg({ ok: true, text: 'Settings saved.' });
      } else {
        setSaveMsg({ ok: false, text: data.error ?? 'Save failed.' });
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Network error.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    if (!window.confirm('Run daily automation now? This will generate, validate, and optionally schedule a new test.')) return;
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await fetch('/api/admin/automation/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json() as { status?: string; message?: string; generatedTestId?: string };
      const ok = data.status === 'SUCCESS' || data.status === 'HELD_FOR_REVIEW';
      setRunMsg({
        ok,
        text: data.message ?? (ok ? 'Run completed.' : 'Run failed.'),
      });
      await loadData(); // Refresh runs list
    } catch {
      setRunMsg({ ok: false, text: 'Network error.' });
    } finally {
      setRunning(false);
    }
  }

  // Determine workflow state from latest run
  const latestRun = runs[0] ?? null;
  const wfRunning  = latestRun?.status === 'RUNNING';
  const wfDone     = latestRun?.status === 'SUCCESS';
  const wfFailed   = latestRun?.status === 'FAILED';
  const wfHeld     = latestRun?.status === 'HELD_FOR_REVIEW';

  const wfGenDone    = wfDone || wfHeld || wfFailed && latestRun?.generationStatus === 'GENERATED';
  const wfGenFailed  = wfFailed && latestRun?.errorStage === 'GENERATION';
  const wfValDone    = (wfDone || wfHeld) && !!latestRun?.validationStatus;
  const wfValFailed  = wfFailed && latestRun?.errorStage === 'VALIDATION';
  const wfValHeld    = wfHeld;
  const wfPubDone    = wfDone && !!latestRun?.publicationStatus && !latestRun.publicationStatus.includes('FAILED');

  const formatIST = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading automation settings…</div>;
  }

  return (
    <div className="space-y-10">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin/tests" className="text-sm text-slate-400 hover:text-slate-700">← Tests</Link>
          <Link href="/admin/topics" className="text-sm text-brand-600 hover:text-brand-800 font-semibold border border-brand-200 px-3 py-1 rounded-lg">📋 Topic Queue</Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-700 font-medium">Automation</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Daily Test Automation</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure automatic daily test generation. Agent 4 coordinates: Generate → Validate → Schedule.
        </p>

        {/* Security notice */}
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          <strong>Security notice:</strong> Admin pages currently use lightweight email identity only, which is not a secure admin authentication method.
          Anyone with the URL can access this page. A proper admin auth layer should be added before this portal becomes publicly known.
        </div>
      </div>

      {/* ─── Status Panel ───────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">Automation Status</h2>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${form.enabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
                <span className={`h-2 w-2 rounded-full ${form.enabled ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                Auto Generation: {form.enabled ? 'ON' : 'OFF'}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${form.autoPublish ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                Auto Publish: {form.autoPublish ? 'ON' : 'OFF'}
              </span>
            </div>

            {config && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-0.5">Next Topic</div>
                  <div className="font-semibold text-slate-800 truncate">{config.topic || <span className="text-amber-600 text-xs">⚠ Not set</span>}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-0.5">Category</div>
                  <div className="font-semibold text-slate-800">{config.category}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-0.5">Generate Time (IST)</div>
                  <div className="font-semibold text-slate-800">{config.generateTime}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-0.5">Publish Time (IST)</div>
                  <div className="font-semibold text-slate-800">{config.publishTime}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-0.5">Last Run</div>
                  <div className="font-semibold text-slate-800 text-xs">{formatIST(config.lastRunAt)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-0.5">Last Result</div>
                  {config.lastRunStatus ? <StatusBadge status={config.lastRunStatus} /> : <span className="text-slate-400 text-xs">—</span>}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => { void handleRunNow(); }}
              disabled={running || (form.topicMode === 'MANUAL' && !config?.topic?.trim())}
              className="text-sm font-bold px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors"
            >
              {running ? '⟳ Running…' : '▶ Run Now'}
            </button>
            <p className="text-xs text-slate-400 text-center">Same as daily cron</p>
          </div>
        </div>

        {runMsg && (
          <div className={`mt-4 text-sm font-medium px-3 py-2 rounded-lg ${runMsg.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {runMsg.ok ? '✅ ' : '❌ '}{runMsg.text}
          </div>
        )}
      </section>

      {/* ─── Workflow Visual ─────────────────────────────────────── */}
      {latestRun && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Last Run Workflow
            <span className="ml-2 text-xs font-normal text-slate-400">{formatDate(latestRun.scheduledFor)}</span>
          </h2>
          <div className="flex items-start">
            <WorkflowStep label="Scheduled" done active={!latestRun.startedAt} />
            <WorkflowConnector done={!!latestRun.startedAt} />
            <WorkflowStep label="Generating" active={wfRunning && !latestRun.generationStatus} done={wfGenDone} failed={wfGenFailed} />
            <WorkflowConnector done={wfGenDone} />
            <WorkflowStep label="Validating" active={wfRunning && !!latestRun.generationStatus} done={wfValDone} failed={wfValFailed} />
            <WorkflowConnector done={wfValDone && !wfValHeld} />
            <WorkflowStep
              label={wfValHeld ? 'Held for Review' : 'Published'}
              active={false}
              done={wfPubDone}
              failed={wfValHeld || (wfDone && !!latestRun.publicationStatus?.includes('FAILED'))}
            />
          </div>
          <div className="mt-4 text-sm text-slate-600">
            <StatusBadge status={latestRun.status} />
            {latestRun.errorMessage && (
              <span className="ml-2 text-red-600 text-xs">{latestRun.errorStage}: {latestRun.errorMessage.slice(0, 120)}</span>
            )}
            {latestRun.generatedTestId && (
              <Link href={`/admin/tests/${latestRun.generatedTestId}`} className="ml-3 text-xs text-brand-600 hover:underline">
                View Generated Test →
              </Link>
            )}
          </div>
          {latestRun.generationDurationMs && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              {latestRun.generationDurationMs && <span>Generation: {(latestRun.generationDurationMs / 1000).toFixed(1)}s</span>}
              {latestRun.validationDurationMs && <span>Validation: {(latestRun.validationDurationMs / 1000).toFixed(1)}s</span>}
              {latestRun.publicationStatus && <span>Publication: {latestRun.publicationStatus}</span>}
            </div>
          )}
        </section>
      )}

      {/* ─── Settings Form ───────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <h2 className="text-base font-bold text-slate-900 mb-6">Automation Settings</h2>

        <form onSubmit={(e) => { void handleSave(e); }} className="space-y-6">
          {/* Toggles */}
          <div className="flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
              <Toggle value={form.enabled} onChange={(v) => setField('enabled', v)} label="Enable automation" />
              <span className="text-sm font-semibold text-slate-700">Auto Generation</span>
              <span className="text-xs text-slate-400">{form.enabled ? 'ON' : 'OFF'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Toggle value={form.autoPublish} onChange={(v) => setField('autoPublish', v)} label="Auto publish" />
              <span className="text-sm font-semibold text-slate-700">Auto Publish</span>
              <span className="text-xs text-slate-400">{form.autoPublish ? 'ON — publishes at configured time' : 'OFF — leaves as READY for manual publish'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Toggle value={form.allowRepeat} onChange={(v) => setField('allowRepeat', v)} label="Allow topic repeat" />
              <span className="text-sm font-semibold text-slate-700">Allow Topic Repeat</span>
              <span className="text-xs text-slate-400">{form.allowRepeat ? 'ON — same topic allowed' : 'OFF — blocks if topic used in last 30 days'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Exam */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam</label>
              <select value={form.exam} onChange={(e) => setField('exam', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {EXAMS.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => setField('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Topic Source */}
            <div className="sm:col-span-2 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Topic Source</label>
              <div className="flex gap-3">
                {(['MANUAL', 'QUEUE'] as const).map((mode) => (
                  <button key={mode} type="button"
                    onClick={() => setField('topicMode', mode)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${form.topicMode === mode
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                  >
                    {mode === 'MANUAL' ? '✏ Manual Topic' : '📋 Topic Queue (Agent 5)'}
                  </button>
                ))}
              </div>

              {form.topicMode === 'MANUAL' ? (
                <div>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={(e) => setField('topic', e.target.value)}
                    placeholder="e.g. Indian National Movement, Photosynthesis, Indian Rivers"
                    maxLength={200}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {config?.lastRunStatus === 'SUCCESS' && config.topic === form.topic && (
                    <p className="text-xs text-amber-600 mt-1">⚠ This topic was used in the last run</p>
                  )}
                </div>
              ) : (
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
                  {nextTopic ? (
                    <div className="space-y-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-slate-500">Next Suggested Topic</p>
                          <p className="font-bold text-brand-700 text-base">{nextTopic.topic}</p>
                          <p className="text-xs text-slate-600">{nextTopic.category} · Priority {nextTopic.priority} · Used {nextTopic.timesUsed}×</p>
                        </div>
                        <Link href="/admin/topics"
                          className="text-xs text-brand-600 hover:underline font-semibold border border-brand-200 px-2 py-1 rounded-lg">
                          View Queue →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-amber-700">⚠ No eligible topic in queue</p>
                      <Link href="/admin/topics"
                        className="text-xs text-brand-600 hover:underline font-semibold">Add topics →</Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Difficulty</label>
              <select value={form.difficulty} onChange={(e) => setField('difficulty', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500">
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Questions */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Questions <span className="text-slate-400 font-normal text-xs">(5–50)</span></label>
              <input type="number" min={5} max={50} value={form.totalQuestions}
                onChange={(e) => setField('totalQuestions', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (minutes)</label>
              <input type="number" min={5} max={180} value={form.durationMinutes}
                onChange={(e) => setField('durationMinutes', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            {/* Generate Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Generate Time (IST)
                <span className="ml-1 text-xs font-normal text-slate-400">— display only, cron runs at 4:00 AM IST</span>
              </label>
              <input type="time" value={form.generateTime}
                onChange={(e) => setField('generateTime', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            {/* Publish Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Publish Time (IST)
                {form.autoPublish && <span className="ml-1 text-xs font-normal text-slate-400">— test will be scheduled for this time</span>}
              </label>
              <input type="time" value={form.publishTime}
                onChange={(e) => setField('publishTime', e.target.value)}
                disabled={!form.autoPublish}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:bg-slate-50" />
            </div>

            {/* Timezone (locked) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Timezone</label>
              <div className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500 bg-slate-50">Asia/Kolkata (IST, UTC+5:30)</div>
            </div>
          </div>

          {saveMsg && (
            <div className={`text-sm font-medium px-3 py-2 rounded-lg ${saveMsg.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {saveMsg.ok ? '✅ ' : '❌ '}{saveMsg.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="btn-primary px-6 py-2.5 text-sm font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Automation Settings'}
            </button>
          </div>
        </form>
      </section>

      {/* ─── Cron Info ───────────────────────────────────────────── */}
      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Cron Schedule</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="font-semibold text-slate-800 mb-0.5">Daily Automation</div>
            <code className="text-brand-700">/api/cron/daily-test-automation</code>
            <div className="text-slate-400 mt-0.5">Runs at 22:30 UTC = 4:00 AM IST daily</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="font-semibold text-slate-800 mb-0.5">Publish Scheduled Tests</div>
            <code className="text-brand-700">/api/cron/publish-scheduled-tests</code>
            <div className="text-slate-400 mt-0.5">Runs at 00:00 UTC = 5:30 AM IST daily</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          <strong>Action required:</strong> Add <code>CRON_SECRET</code> in Vercel Environment Variables → Settings → Environment Variables.
          Without it, cron requests return 503.
        </div>
      </section>

      {/* ─── Run History ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-slate-900 mb-4">Automation History</h2>
        {runs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center text-slate-400 text-sm">
            No automation runs yet. Click Run Now or wait for the daily cron.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {runs.map((run) => (
              <div key={run.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
                {/* Date */}
                <div className="shrink-0 w-20 text-xs font-semibold text-slate-500">
                  {formatDate(run.scheduledFor)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{run.topic ?? '—'}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {run.category} · {run.exam}
                    {run.generationDurationMs && ` · Gen: ${(run.generationDurationMs / 1000).toFixed(1)}s`}
                    {run.validationDurationMs && ` · Val: ${(run.validationDurationMs / 1000).toFixed(1)}s`}
                  </div>
                  {run.errorMessage && (
                    <div className="text-xs text-red-600 mt-0.5 truncate">{run.errorStage}: {run.errorMessage.slice(0, 100)}</div>
                  )}
                </div>

                {/* Status + link */}
                <div className="flex items-center gap-2">
                  <StatusBadge status={run.status} />
                  {run.generatedTestId && (
                    <Link href={`/admin/tests/${run.generatedTestId}`}
                      className="text-xs text-brand-600 hover:underline whitespace-nowrap">
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
