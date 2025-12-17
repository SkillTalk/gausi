"use client";
import { useEffect, useState } from 'react';

export function RotatingWords({ words, intervalMs = 1800 }: { words: string[]; intervalMs?: number }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words, intervalMs]);
  return <span className="heading-gradient">{words[idx]}</span>;
}


