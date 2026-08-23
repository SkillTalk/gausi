'use client';

import type { Lang } from '@/types/exam';
import { ExamTimer } from './Timer';
import { LanguageSelector } from './LanguageSelector';

type Props = {
  examName: string;
  questionIndex: number;
  totalQuestions: number;
  lang: Lang;
  expiresAt: number;
  onExpire: () => void;
  onLangChange: (lang: Lang) => void;
  onSubmitClick: () => void;
};

export function ExamHeader({
  examName,
  questionIndex,
  totalQuestions,
  lang,
  expiresAt,
  onExpire,
  onLangChange,
  onSubmitClick,
}: Props) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="container flex h-14 items-center justify-between gap-3">
        {/* Left: exam name + progress */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-1 rounded-full whitespace-nowrap">
            {examName}
          </span>
          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
            Q {questionIndex + 1}/{totalQuestions}
          </span>
        </div>

        {/* Centre: language toggle */}
        <div className="flex-shrink-0">
          <LanguageSelector selected={lang} onChange={onLangChange} showSwitchNote={false} />
        </div>

        {/* Right: timer + submit */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-1.5">
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <ExamTimer expiresAt={expiresAt} onExpire={onExpire} />
          </div>
          {/* Submit — visible on all screen sizes; compact on mobile */}
          <button
            onClick={onSubmitClick}
            className="btn-danger text-[11px] sm:text-xs py-1.5 px-2 sm:px-3 font-semibold"
          >
            Submit
          </button>
        </div>
      </div>
    </header>
  );
}
