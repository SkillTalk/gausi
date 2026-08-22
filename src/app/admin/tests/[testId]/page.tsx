'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { GeneratedTestWithQuestions, GeneratedQuestion } from '@/types/generated-test';
import type { StoredTestValidation, StoredQuestionValidation, ValidationIssue } from '@/types/validation';
import type { RepairMode } from '@/lib/admin/repair.service';

type Params = { testId: string };

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  DRAFT:              'bg-slate-100 text-slate-500',
  GENERATING:         'bg-amber-100 text-amber-700',
  GENERATED:          'bg-blue-100 text-blue-700',
  VALIDATING:         'bg-purple-100 text-purple-700',
  READY:              'bg-green-100 text-green-800',
  VALIDATION_FAILED:  'bg-red-100 text-red-700',
  PUBLISHED:          'bg-brand-100 text-brand-700',
  ARCHIVED:           'bg-slate-100 text-slate-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

// ─── Validation question badge ────────────────────────────────────────────────

const QVAL_STYLES: Record<string, string> = {
  PASS:               'bg-green-100 text-green-700 border-green-200',
  FAIL:               'bg-red-100 text-red-700 border-red-200',
  REVIEW:             'bg-amber-100 text-amber-700 border-amber-200',
  NEEDS_REVALIDATION: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

function QuestionValidationBadge({ status }: { status: string }) {
  const icon =
    status === 'PASS'               ? '✓' :
    status === 'FAIL'               ? '✗' :
    status === 'NEEDS_REVALIDATION' ? '⟳' : '⚑';
  const label =
    status === 'NEEDS_REVALIDATION' ? 'Needs Revalidation' : status;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${QVAL_STYLES[status] ?? ''}`}>
      {icon} {label}
    </span>
  );
}

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className={`flex items-start gap-2 text-xs rounded px-2 py-1.5 ${
      issue.severity === 'ERROR' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
    }`}>
      <span className="font-bold shrink-0">{issue.severity === 'ERROR' ? '✗' : '⚠'}</span>
      <div>
        <span className="font-semibold">[{issue.type}]</span>{' '}
        {issue.message}
      </div>
    </div>
  );
}

// ─── Repair Modal ─────────────────────────────────────────────────────────────

type RepairModalProps = {
  testId: string;
  question: GeneratedQuestion;
  qVal: StoredQuestionValidation;
  onClose: () => void;
  onRepaired: () => void;
};

function RepairModal({ testId, question, qVal, onClose, onRepaired }: RepairModalProps) {
  const [mode, setMode] = useState<RepairMode>('AUTO_FIX');
  const [instruction, setInstruction] = useState('');
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issues = qVal.issues as ValidationIssue[];

  async function handleRepair() {
    setRepairing(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/tests/${testId}/questions/${question.id}/repair`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repairMode: mode,
            instruction: instruction.trim() || undefined,
          }),
        },
      );
      const data = await res.json() as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? 'Repair failed. Please try again.');
        return;
      }
      onRepaired();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setRepairing(false);
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-base font-extrabold text-slate-900">Fix / Regenerate Question</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>

        {/* Validator feedback */}
        {issues.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Problem</p>
            {issues.map((issue, i) => (
              <div key={i} className={`text-xs rounded px-2 py-1.5 ${
                issue.severity === 'ERROR' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
              }`}>
                <span className="font-semibold">[{issue.type}]</span> {issue.message}
              </div>
            ))}
          </div>
        )}
        {qVal.suggestedFix && (
          <div className="text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2">
            <span className="font-semibold text-slate-600">Suggested fix: </span>
            {qVal.suggestedFix}
          </div>
        )}

        {/* Repair mode */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Repair Mode</p>
          <div className="flex gap-2">
            {(['AUTO_FIX', 'REPLACE'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg border transition-colors ${
                  mode === m
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {m === 'AUTO_FIX' ? '✏ Auto Fix' : '↺ Replace with New'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {mode === 'AUTO_FIX'
              ? 'Rewrite the existing question to fix the issue, preserving the learning objective.'
              : 'Discard the question and generate a fresh one on the same topic.'}
          </p>
        </div>

        {/* Optional admin instruction */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Additional Instruction (optional)
          </label>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={`e.g. Keep the question focused on South African Satyagraha, not Mandela.`}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-400 mt-0.5">{instruction.length}/500</p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            ❌ {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { void handleRepair(); }}
            disabled={repairing}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {repairing ? 'Repairing…' : mode === 'AUTO_FIX' ? '✏ Auto Fix' : '↺ Replace Question'}
          </button>
          <button
            onClick={onClose}
            disabled={repairing}
            className="px-4 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Option row ───────────────────────────────────────────────────────────────

function OptionRow({ letter, hi, en, isCorrect }: { letter: string; hi: string; en: string; isCorrect: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-2 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : ''}`}>
      <span className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border ${
        isCorrect ? 'bg-green-600 text-white border-green-600' : 'border-slate-300 text-slate-500'
      }`}>
        {letter}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-800">{hi}</div>
        <div className="text-xs text-slate-500 mt-0.5">{en}</div>
      </div>
      {isCorrect && <span className="text-xs font-bold text-green-700 shrink-0">✓ Correct</span>}
    </div>
  );
}

// ─── Question card (with optional validation overlay) ────────────────────────

function QuestionCard({
  q,
  index,
  qVal,
  needsRevalidation,
  onRepair,
  isPublished,
}: {
  q: GeneratedQuestion;
  index: number;
  qVal?: StoredQuestionValidation;
  /**
   * True when this question was repaired after the current TestValidation snapshot.
   * When true, show "Needs Revalidation" badge and suppress stale issue details.
   */
  needsRevalidation: boolean;
  onRepair?: (q: GeneratedQuestion, qv: StoredQuestionValidation) => void;
  isPublished: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const hasIssues = !needsRevalidation && qVal && (qVal.issues as ValidationIssue[]).length > 0;
  // Allow re-repair if already repaired (needsRevalidation) OR if old val shows FAIL/REVIEW
  const canRepair = !isPublished && (
    needsRevalidation ||
    (qVal && (qVal.status === 'FAIL' || qVal.status === 'REVIEW'))
  );

  return (
    <div className={`bg-white border rounded-xl p-5 space-y-4 ${
      needsRevalidation         ? 'border-cyan-300' :
      qVal?.status === 'FAIL'   ? 'border-red-300' :
      qVal?.status === 'REVIEW' ? 'border-amber-300' :
      qVal?.status === 'PASS'   ? 'border-green-200' :
      'border-slate-200'
    }`}>
      {/* Question header */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 h-7 w-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-extrabold">
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">{q.questionHi}</div>
          <div className="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-wrap">{q.questionEn}</div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {needsRevalidation
            ? <QuestionValidationBadge status="NEEDS_REVALIDATION" />
            : qVal
            ? <QuestionValidationBadge status={qVal.status} />
            : null
          }
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{q.category}</span>
          <span className="text-xs text-slate-400">{q.difficulty}</span>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-1.5 pl-10">
        <OptionRow letter="A" hi={q.optionAHi} en={q.optionAEn} isCorrect={q.correctOption === 'A'} />
        <OptionRow letter="B" hi={q.optionBHi} en={q.optionBEn} isCorrect={q.correctOption === 'B'} />
        <OptionRow letter="C" hi={q.optionCHi} en={q.optionCEn} isCorrect={q.correctOption === 'C'} />
        <OptionRow letter="D" hi={q.optionDHi} en={q.optionDEn} isCorrect={q.correctOption === 'D'} />
        <OptionRow letter="E" hi={q.optionEHi} en={q.optionEEn} isCorrect={false} />
      </div>

      {/* Explanation */}
      <div className="pl-10 pt-1 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 mb-0.5">Explanation</p>
        <p className="text-sm text-slate-700">{q.explanationHi}</p>
        <p className="text-xs text-slate-500 mt-0.5">{q.explanationEn}</p>
      </div>

      {/* Validation details — only for FAIL/REVIEW AND only when the result is fresh */}
      {(needsRevalidation || (qVal && qVal.status !== 'PASS')) && (
        <div className="pl-10 pt-2 border-t border-slate-100 space-y-2">
          {needsRevalidation ? (
            /* ── Repaired question: suppress stale issues, show revalidation prompt ── */
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-cyan-700">
                <span className="text-base">⟳</span>
                <span>
                  This question was repaired. Stale validation details are hidden.
                  Click <strong>Revalidate Test</strong> above to get fresh results.
                </span>
              </div>
              {/* Allow re-repair while waiting for revalidation */}
              {canRepair && onRepair && qVal && (
                <button
                  onClick={() => onRepair(q, qVal)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                >
                  🔧 Repair Again
                </button>
              )}
            </div>
          ) : (
            /* ── Fresh FAIL/REVIEW: show full details + repair button ── */
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={() => setShowDetails((p) => !p)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  {showDetails ? '▲' : '▼'} Validation details
                  {hasIssues && qVal && (
                    <span className="ml-1 text-xs text-slate-400">
                      ({(qVal.issues as ValidationIssue[]).length} issue{(qVal.issues as ValidationIssue[]).length > 1 ? 's' : ''})
                    </span>
                  )}
                </button>

                {/* Repair button */}
                {canRepair && onRepair && qVal && (
                  <button
                    onClick={() => onRepair(q, qVal)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                  >
                    🔧 Fix / Regenerate Question
                  </button>
                )}
              </div>

              {showDetails && qVal && (
                <div className="space-y-1.5">
                  {(qVal.issues as ValidationIssue[]).map((issue, i) => (
                    <IssueRow key={i} issue={issue} />
                  ))}
                  {qVal.suggestedFix && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5">
                      <span className="font-semibold">Suggested fix:</span> {qVal.suggestedFix}
                    </div>
                  )}
                  {qVal.factualNotes && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5">
                      <span className="font-semibold">Factual notes:</span> {qVal.factualNotes}
                    </div>
                  )}
                  <div className="text-xs text-slate-400">
                    Confidence: {Math.round(qVal.confidence * 100)}%
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Validation summary panel ─────────────────────────────────────────────────

function ValidationSummaryPanel({ validation }: { validation: StoredTestValidation }) {
  const {
    passed, failed, reviewNeeded, totalQuestions, overallStatus,
    validationSummary, validatorModel, validationMs, validatedAt,
    isStale, repairedQuestionIds,
  } = validation;

  const repairedCount = repairedQuestionIds?.length ?? 0;

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${
      isStale ? 'bg-slate-50 border-slate-300' :
      overallStatus === 'READY' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      {/* Stale banner */}
      {isStale && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <span className="text-amber-600 shrink-0">⚠</span>
          <div className="text-xs text-amber-800">
            <span className="font-bold">Validation is from a previous version.</span>
            {repairedCount > 0
              ? ` ${repairedCount} question${repairedCount > 1 ? 's were' : ' was'} repaired since this snapshot. Repaired question${repairedCount > 1 ? 's show' : ' shows'} "Needs Revalidation" below.`
              : ' Revalidate to refresh results.'}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className={`text-base font-bold ${
          isStale ? 'text-slate-500' :
          overallStatus === 'READY' ? 'text-green-800' : 'text-red-700'
        }`}>
          {isStale
            ? '⏳ Previous Validation Snapshot'
            : overallStatus === 'READY'
            ? '✅ Validation Passed — READY'
            : '❌ Validation Failed'}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/70 rounded-lg p-3 text-center">
          <div className="text-lg font-extrabold text-green-700">{passed}</div>
          <div className="text-xs text-slate-500">Passed</div>
        </div>
        <div className="bg-white/70 rounded-lg p-3 text-center">
          <div className="text-lg font-extrabold text-red-600">{failed}</div>
          <div className="text-xs text-slate-500">Failed</div>
        </div>
        <div className="bg-white/70 rounded-lg p-3 text-center">
          <div className="text-lg font-extrabold text-amber-600">{reviewNeeded}</div>
          <div className="text-xs text-slate-500">Need Review</div>
        </div>
      </div>

      {validationSummary && (
        <p className="text-sm text-slate-700">{validationSummary}</p>
      )}

      <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
        {validatorModel && <span>Model: {validatorModel}</span>}
        {validationMs && <span>Duration: {(validationMs / 1000).toFixed(1)}s</span>}
        <span>Validated: {new Date(validatedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <span>Total: {totalQuestions}Q</span>
        {isStale && <span className="text-amber-500 font-medium">(snapshot — stale)</span>}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTestPreviewPage({ params }: { params: Params }) {
  const { testId } = params;
  const router = useRouter();

  const [test, setTest] = useState<GeneratedTestWithQuestions | null>(null);
  const [validation, setValidation] = useState<StoredTestValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [cancellingSchedule, setCancellingSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('05:00');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Repair state ────────────────────────────────────────────────────────────
  type RepairTarget = { question: GeneratedQuestion; qVal: StoredQuestionValidation };
  const [repairTarget, setRepairTarget] = useState<RepairTarget | null>(null);
  const [repairBanner, setRepairBanner] = useState<string | null>(null);

  // Build a lookup map: questionId → validation result
  const valByQuestionId = new Map<string, StoredQuestionValidation>();
  if (validation) {
    for (const qv of validation.questionResults) {
      valByQuestionId.set(qv.questionId, qv);
    }
  }

  // Build a set of repaired questionIds (empty when validation is fresh)
  const repairedSet = new Set<string>(validation?.repairedQuestionIds ?? []);

  const reloadTest = useCallback(() => {
    return fetch(`/api/admin/tests/${testId}`)
      .then((r) => r.json() as Promise<{ test?: GeneratedTestWithQuestions; error?: string }>)
      .then((d) => {
        if (d.test) setTest(d.test);
      });
  }, [testId]);

  const reloadValidation = useCallback(() => {
    return fetch(`/api/admin/tests/${testId}/validation`)
      .then((r) => r.json() as Promise<{ validation?: StoredTestValidation | null }>)
      .then((d) => {
        setValidation(d.validation ?? null);
      });
  }, [testId]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/tests/${testId}`)
        .then((r) => r.json() as Promise<{ test?: GeneratedTestWithQuestions; error?: string }>)
        .then((d) => {
          if (d.test) setTest(d.test);
          else setError(d.error ?? 'Not found.');
        }),
      fetch(`/api/admin/tests/${testId}/validation`)
        .then((r) => r.json() as Promise<{ validation?: StoredTestValidation | null }>)
        .then((d) => {
          setValidation(d.validation ?? null);
        }),
    ])
      .catch(() => setError('Failed to load test.'))
      .finally(() => setLoading(false));
  }, [testId]);

  async function handleValidate() {
    setValidating(true);
    try {
      const res = await fetch(`/api/admin/tests/${testId}/validate`, { method: 'POST' });
      const data = await res.json() as { error?: string; status?: string };
      if (!res.ok) {
        alert(data.error ?? 'Validation failed. Please try again.');
      }
      // Reload both test status and validation results
      await Promise.all([reloadTest(), reloadValidation()]);
    } catch {
      alert('Network error during validation.');
    } finally {
      setValidating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this test and all its questions? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`/api/admin/tests/${testId}`, { method: 'DELETE' });
    router.push('/admin/tests');
  }

  async function handleRegenerate() {
    if (!window.confirm(`Regenerate all ${test?.totalQuestions} questions? Current questions will be replaced.`)) return;
    setRegenerating(true);
    const res = await fetch(`/api/admin/tests/${testId}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    const data = await res.json() as { error?: string };
    if (res.ok) {
      await Promise.all([reloadTest(), reloadValidation()]);
    } else {
      alert(data.error ?? 'Regeneration failed.');
    }
    setRegenerating(false);
  }

  async function handlePublishNow() {
    if (!window.confirm('Publish this test now? It will immediately appear on public pages.')) return;
    setPublishing(true);
    setPublishMsg(null);
    try {
      const res = await fetch(`/api/admin/tests/${testId}/publish`, { method: 'POST' });
      const data = await res.json() as { error?: string; publishedAt?: string };
      if (res.ok) {
        setPublishMsg({ ok: true, text: `Published at ${data.publishedAt ? new Date(data.publishedAt).toLocaleString('en-IN') : 'now'}.` });
        await reloadTest();
      } else {
        setPublishMsg({ ok: false, text: data.error ?? 'Publish failed.' });
      }
    } catch {
      setPublishMsg({ ok: false, text: 'Network error.' });
    } finally {
      setPublishing(false);
    }
  }

  async function handleSchedule() {
    if (!scheduleDate || !scheduleTime) {
      alert('Please enter a date and time.');
      return;
    }
    // Convert IST to UTC (IST = UTC+5:30)
    const istDateStr = `${scheduleDate}T${scheduleTime}:00+05:30`;
    const publishAt = new Date(istDateStr);
    if (isNaN(publishAt.getTime())) {
      alert('Invalid date or time.');
      return;
    }
    if (publishAt <= new Date()) {
      alert('Scheduled time must be in the future.');
      return;
    }
    setScheduling(true);
    setPublishMsg(null);
    try {
      const res = await fetch(`/api/admin/tests/${testId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishAt: publishAt.toISOString() }),
      });
      const data = await res.json() as { error?: string; publishAt?: string };
      if (res.ok) {
        setPublishMsg({ ok: true, text: `Scheduled for ${publishAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} IST.` });
        setShowScheduleForm(false);
        await reloadTest();
      } else {
        setPublishMsg({ ok: false, text: data.error ?? 'Schedule failed.' });
      }
    } catch {
      setPublishMsg({ ok: false, text: 'Network error.' });
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelSchedule() {
    if (!window.confirm('Cancel the scheduled publication? The test will revert to READY.')) return;
    setCancellingSchedule(true);
    setPublishMsg(null);
    try {
      const res = await fetch(`/api/admin/tests/${testId}/cancel-schedule`, { method: 'POST' });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        setPublishMsg({ ok: true, text: 'Schedule cancelled. Test is now READY.' });
        await reloadTest();
      } else {
        setPublishMsg({ ok: false, text: data.error ?? 'Cancel failed.' });
      }
    } catch {
      setPublishMsg({ ok: false, text: 'Network error.' });
    } finally {
      setCancellingSchedule(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm('Archive this test? It will be hidden from public listings but all student attempt history remains intact.')) return;
    setArchiving(true);
    setPublishMsg(null);
    try {
      const res = await fetch(`/api/admin/tests/${testId}/archive`, { method: 'POST' });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        setPublishMsg({ ok: true, text: 'Test archived.' });
        await reloadTest();
      } else {
        setPublishMsg({ ok: false, text: data.error ?? 'Archive failed.' });
      }
    } catch {
      setPublishMsg({ ok: false, text: 'Network error.' });
    } finally {
      setArchiving(false);
    }
  }

  async function handleRepairSuccess() {
    setRepairTarget(null);
    setRepairBanner('Question repaired. Revalidation required before publishing.');
    // Reload both test (to show updated question) and validation (now stale)
    await Promise.all([reloadTest(), reloadValidation()]);
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading test preview...</div>;
  }
  if (error || !test) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error ?? 'Test not found.'}</p>
        <a href="/admin/tests" className="text-brand-600 hover:underline text-sm">← Back to Tests</a>
      </div>
    );
  }

  const planDate = test.plannedPublishAt
    ? new Date(test.plannedPublishAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not set';

  const canValidate = ['GENERATED', 'VALIDATION_FAILED', 'READY'].includes(test.status);
  const canPublishNow = ['READY', 'SCHEDULED'].includes(test.status);
  const canSchedule = test.status === 'READY';
  const canCancelSchedule = test.status === 'SCHEDULED';
  const canArchive = test.status === 'PUBLISHED';
  const isPublished = test.status === 'PUBLISHED';
  const isOperationInProgress = validating || regenerating || deleting || publishing || scheduling || cancellingSchedule || archiving || test.status === 'GENERATING' || test.status === 'VALIDATING';

  // Display schedule time in IST
  const scheduledAtIST = (test as GeneratedTestWithQuestions & { publishAt?: string | null }).publishAt
    ? new Date((test as GeneratedTestWithQuestions & { publishAt?: string | null }).publishAt!).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : null;
  const publishedAtIST = (test as GeneratedTestWithQuestions & { publishedAt?: string | null }).publishedAt
    ? new Date((test as GeneratedTestWithQuestions & { publishedAt?: string | null }).publishedAt!).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : null;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <a href="/admin/tests" className="hover:text-brand-600">Tests</a>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate">{test.topic}</span>
      </div>

      {/* Test Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={test.status} />
              <span className="text-xs text-slate-400">{test.exam}</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">{test.titleEn}</h1>
            <p className="text-slate-500 mt-0.5">{test.titleHi}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Validate / Revalidate */}
            {canValidate && (
              <button
                onClick={() => { void handleValidate(); }}
                disabled={isOperationInProgress}
                className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  validation
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}
              >
                {validating
                  ? 'Validating...'
                  : test.status === 'VALIDATING'
                  ? 'Validating...'
                  : validation
                  ? '↺ Revalidate'
                  : '✓ Validate Test'}
              </button>
            )}

            {/* Regenerate — disabled for immutable states */}
            {!isPublished && test.status !== 'ARCHIVED' && (
              <button
                onClick={() => { void handleRegenerate(); }}
                disabled={isOperationInProgress}
                className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
              >
                {regenerating ? 'Regenerating...' : '↺ Regenerate Full Test'}
              </button>
            )}

            {/* Delete — disabled for PUBLISHED tests */}
            {!isPublished && (
              <button
                onClick={() => { void handleDelete(); }}
                disabled={deleting}
                className="text-sm font-semibold text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Category', value: test.category },
            { label: 'Difficulty', value: test.difficulty },
            { label: 'Questions', value: `${test.totalQuestions}Q · ${test.durationMinutes}min` },
            { label: 'Planned Publish', value: planDate },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 font-medium mb-0.5">{item.label}</div>
              <div className="text-sm font-semibold text-slate-800">{item.value}</div>
            </div>
          ))}
        </div>

        {test.generationModel && (
          <p className="mt-4 text-xs text-slate-400">
            Generated by {test.generationModel}
            {test.generationMs && ` · ${(test.generationMs / 1000).toFixed(1)}s`}
          </p>
        )}
      </div>

      {/* Validation progress indicator */}
      {(validating || test.status === 'VALIDATING') && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex items-center gap-4">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-800">Validation in progress…</p>
            <p className="text-xs text-purple-600 mt-0.5">
              Running deterministic checks, then AI semantic review with gpt-4o. This may take 30–60 seconds.
            </p>
          </div>
        </div>
      )}

      {/* Validation results summary */}
      {validation && !validating && test.status !== 'VALIDATING' && (
        <ValidationSummaryPanel validation={validation} />
      )}

      {/* ── Post-repair banner ──────────────────────────────────────────── */}
      {repairBanner && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-lg">🔧</span>
            <p className="text-sm font-semibold text-amber-800">{repairBanner}</p>
          </div>
          <button
            onClick={() => setRepairBanner(null)}
            className="text-amber-400 hover:text-amber-700 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Publish / Schedule Panel ─────────────────────────────────────── */}
      {(canPublishNow || canSchedule || canCancelSchedule || canArchive || isPublished) && (
        <div className={`rounded-xl border p-5 space-y-4 ${
          isPublished ? 'bg-brand-50 border-brand-200' :
          canCancelSchedule ? 'bg-indigo-50 border-indigo-200' :
          'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Publication</h3>
              {isPublished && publishedAtIST && (
                <p className="text-sm text-brand-700 mt-0.5">Published on {publishedAtIST} IST</p>
              )}
              {canCancelSchedule && scheduledAtIST && (
                <p className="text-sm text-indigo-700 mt-0.5">Scheduled for {scheduledAtIST} IST</p>
              )}
              {canPublishNow && !isPublished && (
                <p className="text-xs text-slate-500 mt-0.5">This test has passed validation and is ready to publish.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {canPublishNow && (
                <button
                  onClick={() => { void handlePublishNow(); }}
                  disabled={isOperationInProgress}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                >
                  {publishing ? 'Publishing…' : '🚀 Publish Now'}
                </button>
              )}
              {canSchedule && (
                <button
                  onClick={() => setShowScheduleForm((p) => !p)}
                  disabled={isOperationInProgress}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                >
                  🗓 Schedule Publication
                </button>
              )}
              {canCancelSchedule && (
                <button
                  onClick={() => { void handleCancelSchedule(); }}
                  disabled={isOperationInProgress}
                  className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-50"
                >
                  {cancellingSchedule ? 'Cancelling…' : '✕ Cancel Schedule'}
                </button>
              )}
              {canArchive && (
                <button
                  onClick={() => { void handleArchive(); }}
                  disabled={isOperationInProgress}
                  className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
                >
                  {archiving ? 'Archiving…' : 'Archive'}
                </button>
              )}
            </div>
          </div>

          {/* Schedule form */}
          {showScheduleForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Schedule Publication (IST)</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Time (IST)</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { void handleSchedule(); }}
                  disabled={scheduling || !scheduleDate}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                >
                  {scheduling ? 'Scheduling…' : 'Confirm Schedule'}
                </button>
                <button
                  onClick={() => setShowScheduleForm(false)}
                  className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {publishMsg && (
            <div className={`text-sm font-medium px-3 py-2 rounded-lg ${publishMsg.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {publishMsg.ok ? '✅ ' : '❌ '}{publishMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Questions ({test.questions.length})
          {validation && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              — {validation.passed} passed · {validation.failed} failed · {validation.reviewNeeded} review
            </span>
          )}
        </h2>
        <div className="space-y-4">
          {test.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={i}
              qVal={valByQuestionId.get(q.id)}
              needsRevalidation={repairedSet.has(q.id)}
              isPublished={isPublished}
              onRepair={(question, qv) => setRepairTarget({ question, qVal: qv })}
            />
          ))}
        </div>
      </div>

      {/* ── Repair Modal ─────────────────────────────────────────────────── */}
      {repairTarget && (
        <RepairModal
          testId={testId}
          question={repairTarget.question}
          qVal={repairTarget.qVal}
          onClose={() => setRepairTarget(null)}
          onRepaired={() => { void handleRepairSuccess(); }}
        />
      )}
    </div>
  );
}
