'use client';

import { cn } from '@/lib/utils';
import type { ExamSession } from '@/types/exam';
import { getQuestionStatus, type QuestionStatusType } from '@/lib/exam/session';

type Props = {
  questions: { id: string }[];
  session: ExamSession;
  currentIndex: number;
  onNavigate: (index: number) => void;
};

const STATUS_CLASS: Record<QuestionStatusType, string> = {
  'not-visited': 'not-visited',
  'not-answered': 'not-answered',
  answered: 'answered',
  'marked-for-review': 'marked-for-review',
  'answered-marked-for-review': 'answered-marked-for-review',
  'option-e': 'option-e',
};

const STATUS_LABEL: Record<QuestionStatusType, string> = {
  'not-visited': 'Not Visited',
  'not-answered': 'Not Answered',
  answered: 'Answered',
  'marked-for-review': 'Marked for Review',
  'answered-marked-for-review': 'Answered + Review',
  'option-e': 'Option E',
};

export function QuestionPalette({ questions, session, currentIndex, onNavigate }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Grid of numbers */}
      <div className="flex flex-wrap gap-2" role="navigation" aria-label="Question palette">
        {questions.map((q, i) => {
          const status = getQuestionStatus(session, q.id);
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => onNavigate(i)}
              aria-label={`Question ${i + 1} — ${STATUS_LABEL[status]}`}
              className={cn('palette-bubble', STATUS_CLASS[status], isCurrent && 'current')}
              title={`Q${i + 1}: ${STATUS_LABEL[status]}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
        {(
          [
            ['answered', 'Answered'],
            ['not-answered', 'Not Answered'],
            ['not-visited', 'Not Visited'],
            ['marked-for-review', 'Review'],
            ['answered-marked-for-review', 'Ans + Review'],
            ['option-e', 'Option E'],
          ] as [QuestionStatusType, string][]
        ).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn('palette-bubble h-5 w-5 text-[10px]', STATUS_CLASS[status])}>
              &nbsp;
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
