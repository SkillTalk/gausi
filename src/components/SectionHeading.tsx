import { ReactNode } from 'react';

export function SectionHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="text-center mb-10">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight">
        <span className="heading-gradient">{title}</span>
      </h2>
      {subtitle ? <p className="mt-3 text-white/80 max-w-2xl mx-auto">{subtitle}</p> : null}
    </div>
  );
}


