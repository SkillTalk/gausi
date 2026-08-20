'use client';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

// Page-change fade using existing Tailwind keyframe — no framer-motion dependency.
// key={pathname} remounts the div on navigation, replaying the CSS animation.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  );
}
