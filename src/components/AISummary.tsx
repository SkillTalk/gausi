"use client";
import { MotionSection } from './MotionSection';

export function AISummary({ excerpt }: { excerpt: string }) {
  return (
    <MotionSection>
      <div className="card p-5 mb-6">
        <div className="text-sm uppercase tracking-wide text-white/60">AI Summary</div>
        <p className="mt-2 text-white/85">
          {excerpt} This article distills key actions and machine-assisted tactics you can apply today.
        </p>
      </div>
    </MotionSection>
  );
}


