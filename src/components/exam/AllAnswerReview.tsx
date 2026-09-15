'use client';

import type { ExamResult, Question, Lang, OptionKey } from '@/types/exam';
import { cn } from '@/lib/utils';

type Props = {
  result: ExamResult;
  questions: Question[];
  lang: Lang;
};

export function AllAnswerReview({ result, questions, lang }: Props) {
  if (result.questions.length === 0) return null;

  return (
    <div className="space-y-4">
      {result.questions.map((item, idx) => {
        const question = questions.find((q) => q.id === item.questionId);
        return (
          <AllAnswerCard
            key={item.questionId}
            index={idx + 1}
            question={question}
            item={item}
            lang={lang}
          />
        );
      })}
    </div>
  );
}

function AllAnswerCard({
  index,
  question,
  item,
  lang,
}: {
  index: number;
  question: Question | undefined;
  item: ExamResult['questions'][number];
  lang: Lang;
}) {
  const statusLabel: Record<typeof item.status, string> = {
    correct: '✓ Correct',
    wrong: '✗ Wrong',
    optionE: '— Skipped (Option E)',
    unanswered: '— Not Answered',
  };
  const cardColour: Record<typeof item.status, string> = {
    correct: 'bg-green-50 border-green-200',
    wrong: 'bg-red-50 border-red-200',
    optionE: 'bg-amber-50 border-amber-200',
    unanswered: 'bg-slate-50 border-slate-200',
  };
  const badgeColour: Record<typeof item.status, string> = {
    correct: 'bg-green-100 text-green-700',
    wrong: 'bg-red-100 text-red-700',
    optionE: 'bg-amber-100 text-amber-700',
    unanswered: 'bg-slate-100 text-slate-600',
  };

  const t = question?.[lang];

  return (
    <div className={cn('rounded-2xl border p-5 space-y-3', cardColour[item.status])}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Q{index}. {question?.category ?? item.questionId}
        </span>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', badgeColour[item.status])}>
          {statusLabel[item.status]}
        </span>
      </div>

      {/* Question text */}
      {t ? (
        <p className="text-slate-900 font-medium leading-relaxed" style={{ fontSize: '16px', lineHeight: 1.7 }}>
          {t.question}
        </p>
      ) : (
        <p className="text-slate-400 italic text-sm">
          Question no longer available (ID: {item.questionId})
        </p>
      )}

      {/* All options */}
      {t && (
        <div className="grid gap-1.5 text-sm">
          {(Object.entries(t.options) as [OptionKey, string][])
            .filter(([, val]) => val)
            .map(([key, val]) => {
              const isCorrect = key === item.correctOption;
              const isSelectedWrong = key === item.selectedOption && !isCorrect;
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-start gap-2 rounded-lg px-3 py-2',
                    isCorrect
                      ? 'bg-green-100 text-green-800 font-semibold'
                      : isSelectedWrong
                      ? 'bg-red-100 text-red-800'
                      : 'bg-white/60 text-slate-700'
                  )}
                >
                  <span className="font-bold shrink-0">{key}.</span>
                  <span className="flex-1">{val}</span>
                  {isCorrect && <span className="shrink-0 text-green-700">✓</span>}
                  {isSelectedWrong && <span className="shrink-0 text-red-600">✗</span>}
                </div>
              );
            })}
        </div>
      )}

      {/* Explanation */}
      {t?.explanation && (
        <div className="bg-white/70 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed border border-slate-100">
          <span className="font-semibold text-slate-900">Explanation: </span>
          {t.explanation}
        </div>
      )}
    </div>
  );
}
