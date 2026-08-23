'use client';

import { useEffect, useState } from 'react';
import { getRemainingMs, timerColourClass, shouldPulse, formatTime } from '@/lib/exam/timer';

type Props = {
  expiresAt: number;
  onExpire: () => void;
};

export function ExamTimer({ expiresAt, onExpire }: Props) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(expiresAt));
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const remaining = getRemainingMs(expiresAt);
      setRemainingMs(remaining);
      if (remaining === 0 && !fired) {
        setFired(true);
        onExpire();
      }
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [expiresAt, onExpire, fired]);

  const colourClass = timerColourClass(remainingMs);
  const pulse = shouldPulse(remainingMs);

  // text-sm on mobile to avoid overflowing the 360px exam header; text-lg on sm+
  return (
    <span
      className={`font-mono font-bold tabular-nums text-sm sm:text-lg ${colourClass} ${pulse ? 'animate-pulse-subtle' : ''}`}
      aria-live="off"
      aria-label={`Time remaining: ${formatTime(remainingMs)}`}
    >
      {formatTime(remainingMs)}
    </span>
  );
}
