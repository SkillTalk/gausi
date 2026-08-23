import { ReactNode } from 'react';

// Thin wrapper that applies a fade-in once on initial page load.
// Uses opacity-only animation (animate-fade-in-page) instead of the transform
// variant (animate-fade-in). Reason: any active CSS `transform` on an ancestor
// creates a new containing block for `position: fixed` descendants, which breaks
// sticky exam headers and fixed bottom navigation bars during the animation window.
// Opacity-only animation avoids that browser behaviour entirely.
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-fade-in-page">
      {children}
    </div>
  );
}
