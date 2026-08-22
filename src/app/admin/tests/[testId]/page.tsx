'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { GeneratedTestWithQuestions, GeneratedQuestion } from '@/types/generated-test';
import type { StoredTestValidation, StoredQuestionValidation, ValidationIssue } from '@/types/validation';
import type { RepairMode } from '@/lib/admin/repair.service';
import { isRepairableValidationResult } from '@/lib/admin/repair-helpers';

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
  const isScopeFail = issue.type === 'TOPIC_SCOPE_FAIL';
  const bgClass = isScopeFail
    ? 'bg-orange-50 text-orange-900 border border-orange-200'
    : issue.severity === 'ERROR'
      ? 'bg-red-50 text-red-800'
      : 'bg-amber-50 text-amber-800';
  const icon = isScopeFail ? '🚫' : issue.severity === 'ERROR' ? '✗' : '⚠';

  return (
    <div className={`flex items-start gap-2 text-xs rounded px-2 py-1.5 ${bgClass}`}>
      <span className="font-bold shrink-0">{icon}</span>
      <div>
        <span className="font-semibold">[{issue.type}]</span>{' '}
        {issue.message}
        {isScopeFail && (
          <div className="mt-0.5 text-orange-700 italic">
            This question is outside the strict topic scope boundary. Replace it with a question that stays within the declared scope.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Repair Modal ─────────────────────────────────────────────────────────────

type RepairModalProps = {
  testId: string;
  question: GeneratedQuestion;
  qVal: StoredQuestionValidation;
  /** Test-level scope fields forwarded from the parent page's test object. */
  strictTopicScope?: string | null;
  excludeScope?: string | null;
  topicAdherenceMode?: string | null;
  onClose: () => void;
  onRepaired: () => void;
};

function RepairModal({
  testId, question, qVal,
  strictTopicScope, excludeScope, topicAdherenceMode,
  onClose, onRepaired,
}: RepairModalProps) {
  const issues = qVal.issues as ValidationIssue[];
  const hasScopeFail = issues.some((i) => i.type === 'TOPIC_SCOPE_FAIL');

  // Default to REPLACE for scope failures — rewriting an out-of-scope question
  // often produces a weak question; replacing with a fresh in-scope one is safer.
  const [mode, setMode] = useState<RepairMode>(hasScopeFail ? 'REPLACE' : 'AUTO_FIX');
  const [instruction, setInstruction] = useState('');
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="border-t-2 border-amber-300 mt-4 pt-4 space-y-4">
      <div className="">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-extrabold text-slate-900">🔧 Fix / Regenerate Question</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>

        {/* TOPIC_SCOPE_FAIL prominent banner */}
        {hasScopeFail && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 space-y-2">
            <p className="text-sm font-bold text-orange-800 flex items-center gap-2">
              🚫 Outside Strict Topic Scope
            </p>
            <div className="space-y-1">
              {issues
                .filter((i) => i.type === 'TOPIC_SCOPE_FAIL')
                .map((issue, idx) => (
                  <p key={idx} className="text-xs text-orange-700">{issue.message}</p>
                ))}
            </div>
            {strictTopicScope && (
              <div className="text-xs bg-white border border-orange-200 rounded-lg px-3 py-2 mt-1">
                <span className="font-semibold text-orange-800 block mb-0.5">Required Scope</span>
                <span className="text-orange-700">{strictTopicScope}</span>
              </div>
            )}
            {excludeScope && (
              <div className="text-xs bg-white border border-orange-200 rounded-lg px-3 py-2">
                <span className="font-semibold text-orange-800 block mb-0.5">Excluded</span>
                <span className="text-orange-700">{excludeScope}</span>
              </div>
            )}
            <p className="text-xs text-orange-600 italic mt-1">
              Recommended: <strong>Replace with New</strong> — rewriting an out-of-scope question often produces a weak result.
            </p>
          </div>
        )}

        {/* Other validator feedback (non-scope issues) */}
        {issues.filter((i) => i.type !== 'TOPIC_SCOPE_FAIL').length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Problem</p>
            {issues
              .filter((i) => i.type !== 'TOPIC_SCOPE_FAIL')
              .map((issue, i) => (
                <div key={i} className={`text-xs rounded px-2 py-1.5 ${
                  issue.severity === 'ERROR' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                }`}>
                  <span className="font-semibold">[{issue.type}]</span> {issue.message}
                </div>
              ))}
          </div>
        )}
        {/* Non-scope issues only — scope suggested fix shown in scope banner */}
        {qVal.suggestedFix && !hasScopeFail && (
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
              ? hasScopeFail
                ? 'Try to rewrite this question so it directly tests the declared topic scope. Use only if the learning objective can be preserved within scope.'
                : 'Rewrite the existing question to fix the issue, preserving the learning objective.'
              : hasScopeFail
                ? 'Discard this question and generate a completely new one strictly within the declared topic scope and exclusions.'
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
            placeholder={
              hasScopeFail
                ? 'e.g. Focus on INC sessions and presidential elections, not broader independence movement.'
                : 'e.g. Keep the question focused on South Indian Satyagraha, not Mandela.'
            }
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-400 mt-0.5">{instruction.length}/500</p>
        </div>

        {/* Scope mode indicator */}
        {topicAdherenceMode && (
          <p className="text-xs text-slate-400">
            Topic Adherence Mode:{' '}
            <span className={`font-semibold ${topicAdherenceMode === 'STRICT' ? 'text-amber-700' : 'text-slate-600'}`}>
              {topicAdherenceMode}
            </span>
            {topicAdherenceMode === 'STRICT' && ' — repaired question will be re-validated for scope compliance.'}
          </p>
        )}

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

// ─── Answer Override Panel ───────────────────────────────────────────────────

type AnswerOverrideModalProps = {
  testId: string;
  question: GeneratedQuestion;
  onClose: () => void;
  onOverridden: (newCorrectOption: string, explanationWarning: boolean) => void;
};

function AnswerOverrideModal({ testId, question, onClose, onOverridden }: AnswerOverrideModalProps) {
  const [selected, setSelected] = useState<string>(question.correctOption);
  const [adminNote, setAdminNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const OPTIONS = ['A', 'B', 'C', 'D'] as const;
  type OptionLetter = (typeof OPTIONS)[number];

  const optionTextHi: Record<OptionLetter, string> = {
    A: question.optionAHi, B: question.optionBHi,
    C: question.optionCHi, D: question.optionDHi,
  };
  const optionTextEn: Record<OptionLetter, string> = {
    A: question.optionAEn, B: question.optionBEn,
    C: question.optionCEn, D: question.optionDEn,
  };

  async function handleSave() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/tests/${testId}/questions/${question.id}/override-answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correctOption: selected, adminNote: adminNote.trim() || undefined }),
        },
      );
      const data = await res.json() as { error?: string; explanationWarning?: boolean };
      if (!res.ok) {
        setError(data.error ?? 'Override failed. Please try again.');
        setConfirmed(false);
        return;
      }
      onOverridden(selected, data.explanationWarning ?? false);
    } catch {
      setError('Network error. Please try again.');
      setConfirmed(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t-2 border-violet-300 mt-4 pt-4 space-y-4">
      <div>
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-sm font-extrabold text-slate-900">🛡 Edit Correct Answer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>

        {/* Question text */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">{question.questionHi}</p>
          <p className="text-xs text-slate-500 whitespace-pre-wrap">{question.questionEn}</p>
        </div>

        {/* Option selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Select Correct Answer</p>
          {OPTIONS.map((letter) => (
            <button
              key={letter}
              onClick={() => { setSelected(letter); setConfirmed(false); }}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                selected === letter
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                selected === letter
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-slate-300 text-slate-500'
              }`}>
                {letter}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-800">{optionTextHi[letter]}</div>
                <div className="text-xs text-slate-500 mt-0.5">{optionTextEn[letter]}</div>
              </div>
              {question.correctOption === letter && selected !== letter && (
                <span className="text-xs text-slate-400 shrink-0">(was correct)</span>
              )}
              {selected === letter && (
                <span className="text-xs font-bold text-brand-700 shrink-0">✓ Selected</span>
              )}
            </button>
          ))}
          <p className="text-xs text-slate-400">Option E cannot be selected as the correct answer.</p>
        </div>

        {/* Optional admin note */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Reason / Note (optional)
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Official NCERT source confirms option C."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Confirmation warning */}
        {confirmed && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
            <p className="font-bold mb-1">⚠ Confirm Answer Override</p>
            <p>
              You are setting the correct answer to <strong>Option {selected}</strong>.
              The selected answer will be treated as authoritative — it will be used for all
              student scoring and will not be re-validated by AI.
            </p>
            <p className="mt-1 text-xs">Click <strong>Save Admin Answer</strong> again to confirm.</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            ❌ {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { void handleSave(); }}
            disabled={saving || selected === question.correctOption}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : confirmed ? '🛡 Confirm — Save Admin Answer' : '🛡 Save Admin Answer'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
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
  isPublished,
  testId,
  activeActionType,
  onActivate,
  onDeactivate,
  onRepairSuccess,
  onOverrideSuccess,
  strictTopicScope,
  excludeScope,
  topicAdherenceMode,
}: {
  q: GeneratedQuestion;
  index: number;
  qVal?: StoredQuestionValidation;
  /** True when this question's questionVersion differs from QVR.questionVersion. */
  needsRevalidation: boolean;
  isPublished: boolean;
  testId: string;
  activeActionType: 'repair' | 'override' | null;
  onActivate: (type: 'repair' | 'override') => void;
  onDeactivate: () => void;
  onRepairSuccess: () => void;
  onOverrideSuccess: (opt: string, warn: boolean) => void;
  strictTopicScope?: string | null;
  excludeScope?: string | null;
  topicAdherenceMode?: string | null;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll the card into view (nearest) when its inline panel opens.
  useEffect(() => {
    if (activeActionType && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeActionType]);

  // ESC key closes the active panel (safe to call while API is idle).
  useEffect(() => {
    if (!activeActionType) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDeactivate();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeActionType, onDeactivate]);

  const hasIssues = !needsRevalidation && qVal && (qVal.issues as ValidationIssue[]).length > 0;
  const canRepair = !isPublished && (
    needsRevalidation ||
    (qVal != null && isRepairableValidationResult(qVal))
  );

  return (
    <div
      ref={cardRef}
      className={`bg-white border rounded-xl p-5 space-y-4 transition-shadow ${
        activeActionType === 'repair'   ? 'border-amber-400 ring-2 ring-amber-200' :
        activeActionType === 'override' ? 'border-violet-400 ring-2 ring-violet-200' :
        needsRevalidation               ? 'border-cyan-300' :
        qVal?.status === 'FAIL'         ? 'border-red-300' :
        qVal?.status === 'REVIEW'       ? 'border-amber-300' :
        qVal?.status === 'PASS'         ? 'border-green-200' :
        'border-slate-200'
      }`}
    >
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
          {/* Admin Answer badge — shown when admin manually overrode the correct option */}
          {(q as GeneratedQuestion & { answerSource?: string }).answerSource === 'ADMIN_VERIFIED' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold bg-violet-50 text-violet-700 border-violet-200">
              🛡 Admin Answer
            </span>
          )}
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
        {/* Edit Correct Answer — shown for PASS questions not already in override mode */}
        {!isPublished && qVal?.status === 'PASS' && !needsRevalidation && activeActionType !== 'repair' && (
          <button
            onClick={() => onActivate('override')}
            className="mt-2 text-xs font-semibold px-3 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 transition-colors"
          >
            🛡 Edit Correct Answer
          </button>
        )}
      </div>

      {/* Validation details — for FAIL/REVIEW/repairable issues AND only when the result is fresh */}
      {(needsRevalidation || (qVal != null && (qVal.status !== 'PASS' || isRepairableValidationResult(qVal)))) && (
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
              {canRepair && qVal && (
                <button
                  onClick={() => onActivate('repair')}
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

                {canRepair && qVal && (
                  <button
                    onClick={() => onActivate('repair')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                  >
                    🔧 Fix / Regenerate Question
                  </button>
                )}
                {!isPublished && (
                  <button
                    onClick={() => onActivate('override')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white transition-colors"
                  >
                    🛡 Edit Correct Answer
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

      {/* ── Inline Repair Panel ─────────────────────────────────────────────── */}
      {activeActionType === 'repair' && qVal && (
        <RepairModal
          testId={testId}
          question={q}
          qVal={qVal}
          strictTopicScope={strictTopicScope}
          excludeScope={excludeScope}
          topicAdherenceMode={topicAdherenceMode}
          onClose={onDeactivate}
          onRepaired={onRepairSuccess}
        />
      )}

      {/* ── Inline Answer Override Panel ────────────────────────────────────── */}
      {activeActionType === 'override' && (
        <AnswerOverrideModal
          testId={testId}
          question={q}
          onClose={onDeactivate}
          onOverridden={onOverrideSuccess}
        />
      )}
    </div>
  );
}

// ─── Validation summary panel ─────────────────────────────────────────────────

function ValidationSummaryPanel({ validation }: { validation: StoredTestValidation }) {
  const {
    passed, failed, reviewNeeded, totalQuestions, overallStatus,
    validationSummary, validatorModel, validationMs, validatedAt,
    isStale, staleQuestionIds, questionsValidated,
  } = validation;

  const staleCount = staleQuestionIds?.length ?? 0;

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
            {staleCount > 0
              ? ` ${staleCount} question${staleCount > 1 ? 's are' : ' is'} stale and need${staleCount === 1 ? 's' : ''} revalidation. Click Revalidate to run AI on changed questions only.`
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
        {questionsValidated !== undefined && (
          <span className="text-purple-500 font-medium">
            AI: {questionsValidated}/{totalQuestions} questions
          </span>
        )}
        {isStale && <span className="text-amber-500 font-medium">(snapshot — stale)</span>}
        {!isStale && staleCount === 0 && <span className="text-green-600 font-medium">✓ All current</span>}
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

  // ── Active inline question action (one at a time) ────────────────────────────
  type ActiveAction = { questionId: string; type: 'repair' | 'override' };
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [repairBanner, setRepairBanner] = useState<string | null>(null);
  const [overrideBanner, setOverrideBanner] = useState<string | null>(null);

  // Build a lookup map: questionId → validation result
  const valByQuestionId = new Map<string, StoredQuestionValidation>();
  if (validation) {
    for (const qv of validation.questionResults) {
      valByQuestionId.set(qv.questionId, qv);
    }
  }

  // Stale question IDs — use per-question version comparison (primary)
  // falling back to legacy repair log signal for older validations.
  const staleSet = new Set<string>(
    validation?.staleQuestionIds ?? validation?.repairedQuestionIds ?? [],
  );

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
    setActiveAction(null);
    setRepairBanner('Question repaired. Revalidation required before publishing.');
    await Promise.all([reloadTest(), reloadValidation()]);
  }

  async function handleOverrideSuccess(newCorrectOption: string, explanationWarning: boolean) {
    setActiveAction(null);
    const baseMsg = `Correct answer changed to Option ${newCorrectOption}. Admin override recorded.`;
    const warnMsg = explanationWarning
      ? ' ⚠ The explanation may reference the old answer — review it before publishing.'
      : '';
    setOverrideBanner(baseMsg + warnMsg);
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
  const staleCount = validation?.staleQuestionIds?.length ?? 0;
  const allCurrent = validation !== null && staleCount === 0;
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
                disabled={isOperationInProgress || allCurrent}
                title={allCurrent ? 'All questions have current validation results — no AI call needed' : undefined}
                className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  allCurrent
                    ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                    : validation
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-brand-600 hover:bg-brand-700 text-white'
                }`}
              >
                {validating || test.status === 'VALIDATING'
                  ? 'Validating...'
                  : allCurrent
                  ? '✓ All Questions Current'
                  : !validation
                  ? '✓ Validate Test'
                  : staleCount > 0
                  ? `↺ Revalidate ${staleCount} Question${staleCount > 1 ? 's' : ''}`
                  : '↺ Revalidate'}
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
            {' · '}Topic Adherence: <span className={`font-semibold ${(test as GeneratedTestWithQuestions & { topicAdherenceMode?: string }).topicAdherenceMode === 'NORMAL' ? 'text-slate-600' : 'text-amber-700'}`}>
              {(test as GeneratedTestWithQuestions & { topicAdherenceMode?: string }).topicAdherenceMode ?? 'STRICT'}
            </span>
          </p>
        )}
        {/* Scope boundary display */}
        {((test as GeneratedTestWithQuestions & { strictTopicScope?: string | null }).strictTopicScope ||
          (test as GeneratedTestWithQuestions & { excludeScope?: string | null }).excludeScope) && (
          <div className="mt-4 space-y-2">
            {(test as GeneratedTestWithQuestions & { strictTopicScope?: string | null }).strictTopicScope && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-blue-800 block mb-0.5">Strict Topic Scope</span>
                <span className="text-blue-700">{(test as GeneratedTestWithQuestions & { strictTopicScope?: string | null }).strictTopicScope}</span>
              </div>
            )}
            {(test as GeneratedTestWithQuestions & { excludeScope?: string | null }).excludeScope && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-orange-800 block mb-0.5">Exclude / Out of Scope</span>
                <span className="text-orange-700">{(test as GeneratedTestWithQuestions & { excludeScope?: string | null }).excludeScope}</span>
              </div>
            )}
          </div>
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

      {/* ── Post-override banner ─────────────────────────────────────────── */}
      {overrideBanner && (
        <div className="bg-violet-50 border border-violet-300 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-violet-600 text-lg">🛡</span>
            <p className="text-sm font-semibold text-violet-800">{overrideBanner}</p>
          </div>
          <button
            onClick={() => setOverrideBanner(null)}
            className="text-violet-400 hover:text-violet-700 text-sm"
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
              needsRevalidation={staleSet.has(q.id)}
              isPublished={isPublished}
              testId={testId}
              activeActionType={activeAction?.questionId === q.id ? activeAction.type : null}
              onActivate={(type) => setActiveAction({ questionId: q.id, type })}
              onDeactivate={() => setActiveAction(null)}
              onRepairSuccess={() => { void handleRepairSuccess(); }}
              onOverrideSuccess={(opt, warn) => { void handleOverrideSuccess(opt, warn); }}
              strictTopicScope={(test as GeneratedTestWithQuestions & { strictTopicScope?: string | null }).strictTopicScope}
              excludeScope={(test as GeneratedTestWithQuestions & { excludeScope?: string | null }).excludeScope}
              topicAdherenceMode={(test as GeneratedTestWithQuestions & { topicAdherenceMode?: string | null }).topicAdherenceMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
