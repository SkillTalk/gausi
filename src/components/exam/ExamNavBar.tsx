'use client';

type Props = {
  isFirst: boolean;
  isLast: boolean;
  isAnswered: boolean;
  isMarked: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClear: () => void;
  onMarkReview: () => void;
  onSubmit: () => void;
};

export function ExamNavBar({
  isFirst,
  isLast,
  isAnswered,
  isMarked,
  onPrev,
  onNext,
  onClear,
  onMarkReview,
  onSubmit,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="btn-secondary text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        {isAnswered && (
          <button onClick={onClear} className="btn-ghost text-sm py-2">
            Clear
          </button>
        )}

        <button
          onClick={onMarkReview}
          className={`btn-ghost text-sm py-2 ${isMarked ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : ''}`}
        >
          {isMarked ? '★ Marked' : '☆ Mark Review'}
        </button>
      </div>

      <div className="flex gap-2">
        {isLast ? (
          <button onClick={onSubmit} className="btn-danger text-sm py-2">
            Submit Test
          </button>
        ) : (
          <button onClick={onNext} className="btn-primary text-sm py-2">
            Save & Next →
          </button>
        )}
      </div>
    </div>
  );
}
