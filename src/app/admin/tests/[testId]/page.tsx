'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import type { GeneratedTestWithQuestions, GeneratedQuestion } from '@/types/generated-test';
import type { StoredTestValidation, StoredQuestionValidation, ValidationIssue } from '@/types/validation';

type Params = Promise<{ testId: string }>;

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
  PASS:   'bg-green-100 text-green-700 border-green-200',
  FAIL:   'bg-red-100 text-red-700 border-red-200',
  REVIEW: 'bg-amber-100 text-amber-700 border-amber-200',
};

function QuestionValidationBadge({ status }: { status: string }) {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚑';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${QVAL_STYLES[status] ?? ''}`}>
      {icon} {status}
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
}: {
  q: GeneratedQuestion;
  index: number;
  qVal?: StoredQuestionValidation;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const hasIssues = qVal && (qVal.issues as ValidationIssue[]).length > 0;

  return (
    <div className={`bg-white border rounded-xl p-5 space-y-4 ${
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
          <div className="text-sm font-semibold text-slate-800 leading-relaxed">{q.questionHi}</div>
          <div className="text-xs text-slate-500 mt-1 leading-relaxed">{q.questionEn}</div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {qVal && <QuestionValidationBadge status={qVal.status} />}
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

      {/* Validation details (only for FAIL / REVIEW) */}
      {qVal && qVal.status !== 'PASS' && (
        <div className="pl-10 pt-2 border-t border-slate-100 space-y-2">
          <button
            onClick={() => setShowDetails((p) => !p)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            {showDetails ? '▲' : '▼'} Validation details
            {hasIssues && (
              <span className="ml-1 text-xs text-slate-400">
                ({(qVal.issues as ValidationIssue[]).length} issue{(qVal.issues as ValidationIssue[]).length > 1 ? 's' : ''})
              </span>
            )}
          </button>

          {showDetails && (
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
        </div>
      )}
    </div>
  );
}

// ─── Validation summary panel ─────────────────────────────────────────────────

function ValidationSummaryPanel({ validation }: { validation: StoredTestValidation }) {
  const { passed, failed, reviewNeeded, totalQuestions, overallStatus, validationSummary, validatorModel, validationMs, validatedAt } = validation;

  return (
    <div className={`rounded-xl border p-5 ${
      overallStatus === 'READY' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-base font-bold ${overallStatus === 'READY' ? 'text-green-800' : 'text-red-700'}`}>
          {overallStatus === 'READY' ? '✅ Validation Passed — READY' : '❌ Validation Failed'}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
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
        <p className="text-sm text-slate-700 mb-2">{validationSummary}</p>
      )}

      <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
        {validatorModel && <span>Model: {validatorModel}</span>}
        {validationMs && <span>Duration: {(validationMs / 1000).toFixed(1)}s</span>}
        <span>Validated: {new Date(validatedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <span>Total: {totalQuestions}Q</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTestPreviewPage({ params }: { params: Params }) {
  const { testId } = use(params);
  const router = useRouter();

  const [test, setTest] = useState<GeneratedTestWithQuestions | null>(null);
  const [validation, setValidation] = useState<StoredTestValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [validating, setValidating] = useState(false);

  // Build a lookup map: questionId → validation result
  const valByQuestionId = new Map<string, StoredQuestionValidation>();
  if (validation) {
    for (const qv of validation.questionResults) {
      valByQuestionId.set(qv.questionId, qv);
    }
  }

  function reloadTest() {
    return fetch(`/api/admin/tests/${testId}`)
      .then((r) => r.json() as Promise<{ test?: GeneratedTestWithQuestions; error?: string }>)
      .then((d) => {
        if (d.test) setTest(d.test);
      });
  }

  function reloadValidation() {
    return fetch(`/api/admin/tests/${testId}/validation`)
      .then((r) => r.json() as Promise<{ validation?: StoredTestValidation | null }>)
      .then((d) => {
        setValidation(d.validation ?? null);
      });
  }

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
  const isOperationInProgress = validating || regenerating || deleting || test.status === 'GENERATING' || test.status === 'VALIDATING';

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

            {/* Regenerate */}
            <button
              onClick={() => { void handleRegenerate(); }}
              disabled={isOperationInProgress}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
            >
              {regenerating ? 'Regenerating...' : '↺ Regenerate Full Test'}
            </button>

            {/* Delete */}
            <button
              onClick={() => { void handleDelete(); }}
              disabled={deleting}
              className="text-sm font-semibold text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
