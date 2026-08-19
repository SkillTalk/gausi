'use client';

import type { Lang } from '@/types/exam';
import { cn } from '@/lib/utils';

type Props = {
  selected: Lang;
  onChange: (lang: Lang) => void;
  /** When true, show a note that switching won't reset timer/answers */
  showSwitchNote?: boolean;
};

export function LanguageSelector({ selected, onChange, showSwitchNote = false }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1"
        role="radiogroup"
        aria-label="Choose language"
      >
        <LangButton lang="hi" label="हिंदी" selected={selected} onClick={onChange} />
        <LangButton lang="en" label="English" selected={selected} onClick={onChange} />
      </div>

      {showSwitchNote && (
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Switching language will not reset your timer or selected answers.
        </p>
      )}
    </div>
  );
}

function LangButton({
  lang,
  label,
  selected,
  onClick,
}: {
  lang: Lang;
  label: string;
  selected: Lang;
  onClick: (l: Lang) => void;
}) {
  const isSelected = selected === lang;
  return (
    <button
      role="radio"
      aria-checked={isSelected}
      onClick={() => onClick(lang)}
      className={cn(
        'rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        isSelected
          ? 'bg-brand-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-white hover:text-slate-900'
      )}
    >
      {label}
    </button>
  );
}
