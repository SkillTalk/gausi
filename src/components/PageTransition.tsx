import { ReactNode } from 'react';

// Thin wrapper that applies the fade-in animation once on initial page load.
// Previously used key={pathname} which forced React to remount the entire page
// tree on every client navigation, causing redundant re-fetches and state loss.
// The CSS animation already fires naturally when Next.js renders the new page.
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  );
}
