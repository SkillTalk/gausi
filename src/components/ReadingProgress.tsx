"use client";
import { useEffect, useState } from 'react';

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const p = (h.scrollTop / total) * 100;
      setProgress(Math.max(0, Math.min(100, p)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-white/10">
      <div className="h-full bg-gradient-to-r from-neon-blue to-neon-cyan" style={{ width: `${progress}%` }} />
    </div>
  );
}


