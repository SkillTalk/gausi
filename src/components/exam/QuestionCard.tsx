'use client';

import { cn } from '@/lib/utils';
import type { Question, OptionKey, Lang } from '@/types/exam';

type Props = {
  question: Question;
  index: number;
  total: number;
  lang: Lang;
  selectedOption: OptionKey | undefined;
  onSelect: (option: OptionKey) => void;
};

const OPTION_LABELS: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

export function QuestionCard({ question, index, total, lang, selectedOption, onSelect }: Props) {
  const t = question[lang];

  return (
    <div className="question-card p-6 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
          {question.category}
        </span>
        <span className="text-sm text-slate-500 font-medium">
          प्रश्न / Q {index + 1} of {total}
        </span>
      </div>

      {/* Question text */}
      <p
        className="mt-4 text-slate-900 font-medium leading-relaxed"
        style={{ fontSize: 'clamp(17px, 2vw, 21px)', lineHeight: '1.65' }}
      >
        {t.question}
      </p>

      {/* Options */}
      <div className="mt-6 flex flex-col gap-2.5" role="radiogroup" aria-label="Answer options">
        {OPTION_LABELS.map((key) => {
          const isSelected = selectedOption === key;
          const isE = key === 'E';

          return (
            <button
              key={key}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(key)}
              className={cn(
                'option-row',
                isSelected && !isE && 'selected',
                isE && 'option-e',
                isSelected && isE && 'selected'
              )}
            >
              {/* Key badge */}
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 mt-0.5',
                  isSelected && !isE
                    ? 'border-brand-500 bg-brand-600 text-white'
                    : isE
                    ? isSelected
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-amber-400 bg-amber-100 text-amber-800'
                    : 'border-slate-300 bg-slate-50 text-slate-600'
                )}
              >
                {key}
              </span>

              {/* Option text */}
              <span
                className={cn(
                  'text-left leading-snug',
                  isE ? 'text-amber-800 italic text-sm' : 'text-slate-800',
                  isSelected && !isE && 'text-brand-900 font-medium'
                )}
                style={{ fontSize: isE ? '14px' : 'clamp(15px, 1.8vw, 17px)' }}
              >
                {t.options[key]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
