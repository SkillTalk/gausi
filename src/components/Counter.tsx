"use client";
import { useEffect, useState } from 'react';

export function Counter({ from = 0, to, durationMs = 1200 }: { from?: number; to: number; durationMs?: number }) {
  const [val, setVal] = useState(from);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      setVal(Math.round(from + (to - from) * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, durationMs]);
  return <>{val}</>;
}


