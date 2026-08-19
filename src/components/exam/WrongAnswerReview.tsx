'use client';

import { useState } from 'react';
import type { ExamResult, Question, Lang, OptionKey } from '@/types/exam';
import { cn } from '@/lib/utils';
import { addToRevision, isInRevision } from '@/lib/exam/revision';

type Props = {
  result: ExamResult;
  questions: Question[];
  lang: Lang;
  hasAiKey: boolean;
};

export function WrongAnswerReview({ result, questions, lang, hasAiKey }: Props) {
  const reviewItems = result.questions.filter(
    (r) => r.status === 'wrong' || r.status === 'optionE' || r.status === 'unanswered'
  );

  if (reviewItems.length === 0) {
    return (
      <div className="card p-8 text-center animate-fade-in">
        <div className="text-4xl mb-3">🎉</div>
        <p className="font-bold text-slate-900 text-lg">No wrong answers!</p>
        <p className="text-slate-500 text-sm mt-1">You answered everything correctly or skipped.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviewItems.map((item) => {
        const question = questions.find((q) => q.id === item.questionId);
        if (!question) return null;
        return (
          <ReviewCard
            key={item.questionId}
            question={question}
            item={item}
            lang={lang}
            testId={result.testId}
            hasAiKey={hasAiKey}
          />
        );
      })}
    </div>
  );
}

function ReviewCard({
  question,
  item,
  lang,
  testId,
  hasAiKey,
}: {
  question: Question;
  item: ExamResult['questions'][number];
  lang: Lang;
  testId: string;
  hasAiKey: boolean;
}) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saved, setSaved] = useState(() => isInRevision(question.id, testId));

  const t = question[lang];

  const handleSaveRevision = () => {
    addToRevision(question.id, testId, item.selectedOption, item.correctOption, item.status === 'wrong' ? 'wrong' : 'optionE');
    setSaved(true);
  };

  const handleAiExplain = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: t.question,
          correctAnswer: t.options[item.correctOption],
          selectedAnswer: item.selectedOption ? t.options[item.selectedOption as OptionKey] : 'Not answered',
          language: lang,
        }),
      });
      const data = await res.json() as { explanation?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setAiExplanation(data.explanation ?? null);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI explanation unavailable.');
    } finally {
      setAiLoading(false);
    }
  };

  const statusLabel: Record<typeof item.status, string> = {
    wrong: 'Wrong Answer',
    optionE: 'Skipped (Option E)',
    unanswered: 'Not Answered',
    correct: 'Correct',
  };

  const statusColour: Record<typeof item.status, string> = {
    wrong: 'bg-red-50 border-red-200',
    optionE: 'bg-amber-50 border-amber-200',
    unanswered: 'bg-slate-50 border-slate-200',
    correct: 'bg-green-50 border-green-200',
  };

  return (
    <div className={cn('rounded-2xl border p-5 space-y-4 animate-fade-in', statusColour[item.status])}>
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {question.category}
        </span>
        <span
          className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full',
            item.status === 'wrong'
              ? 'bg-red-100 text-red-700'
              : item.status === 'optionE'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-600'
          )}
        >
          {statusLabel[item.status]}
        </span>
      </div>

      {/* Question */}
      <p className="text-slate-900 font-medium leading-relaxed" style={{ fontSize: '16px', lineHeight: 1.7 }}>
        {t.question}
      </p>

      {/* Answers */}
      <div className="grid gap-2 text-sm">
        {item.selectedOption && item.selectedOption !== item.correctOption && (
          <div className="flex items-start gap-2 bg-red-100 text-red-800 rounded-lg px-3 py-2">
            <span className="font-bold shrink-0">Your answer:</span>
            <span>{item.selectedOption}. {t.options[item.selectedOption as OptionKey]}</span>
          </div>
        )}
        <div className="flex items-start gap-2 bg-green-100 text-green-800 rounded-lg px-3 py-2">
          <span className="font-bold shrink-0">Correct answer:</span>
          <span>{item.correctOption}. {t.options[item.correctOption]}</span>
        </div>
      </div>

      {/* Built-in explanation */}
      <div className="bg-white/70 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed border border-slate-100">
        <span className="font-semibold text-slate-900">Explanation: </span>
        {t.explanation}
      </div>

      {/* AI explanation */}
      {aiExplanation && (
        <div className="bg-indigo-50 rounded-xl px-4 py-3 text-sm text-indigo-900 leading-relaxed border border-indigo-100">
          <span className="font-semibold">AI: </span>{aiExplanation}
        </div>
      )}
      {aiError && (
        <p className="text-xs text-red-600">{aiError}</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {hasAiKey && !aiExplanation && (
          <button
            onClick={handleAiExplain}
            disabled={aiLoading}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {aiLoading ? 'Loading…' : '✦ Explain More with AI'}
          </button>
        )}
        {!hasAiKey && (
          <span className="text-xs text-slate-400 italic">AI explanation is currently unavailable.</span>
        )}
        {!saved && (
          <button onClick={handleSaveRevision} className="btn-ghost text-xs py-1.5 px-3">
            + Save for Revision
          </button>
        )}
        {saved && (
          <span className="text-xs text-green-700 font-medium">✓ Saved for revision</span>
        )}
      </div>
    </div>
  );
}
