'use client';

import type { ExamSession } from '@/types/exam';
import { getQuestionStatus } from '@/lib/exam/session';

type Props = {
  session: ExamSession;
  questionIds: string[];
  onConfirm: () => void;
  onCancel: () => void;
};

export function SubmitConfirmModal({ session, questionIds, onConfirm, onCancel }: Props) {
  const stats = questionIds.reduce(
    (acc, id) => {
      const s = getQuestionStatus(session, id);
      if (s === 'answered') acc.answered++;
      else if (s === 'option-e') acc.optionE++;
      else if (s === 'not-answered') acc.notAnswered++;
      else if (s === 'marked-for-review') acc.review++;
      else if (s === 'answered-marked-for-review') { acc.answered++; acc.review++; }
      else acc.notVisited++;
      return acc;
    },
    { answered: 0, optionE: 0, notAnswered: 0, review: 0, notVisited: 0 }
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-card-lg p-6 animate-scale-in">
        <h2 id="submit-modal-title" className="text-lg font-bold text-slate-900 mb-1">
          Submit Test?
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          You still have time remaining. Review your progress before submitting.
        </p>

        {/* Summary grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Stat label="Answered" value={stats.answered} colour="green" />
          <Stat label="Not Answered" value={stats.notAnswered} colour="red" />
          <Stat label="Option E" value={stats.optionE} colour="amber" />
          <Stat label="Not Visited" value={stats.notVisited} colour="gray" />
          <Stat label="Marked for Review" value={stats.review} colour="purple" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Continue Test
          </button>
          <button
            onClick={onConfirm}
            className="btn-danger flex-1"
          >
            Submit Final
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, colour }: { label: string; value: number; colour: string }) {
  const colourMap: Record<string, string> = {
    green: 'bg-green-50 text-green-800 border-green-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    gray: 'bg-slate-50 text-slate-700 border-slate-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colourMap[colour] ?? colourMap.gray}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
    </div>
  );
}
