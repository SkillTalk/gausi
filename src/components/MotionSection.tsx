'use client';
import { useEffect, useLayoutEffect, useRef, ReactNode } from 'react';

// IntersectionObserver-based scroll animation — no framer-motion dependency.
// useLayoutEffect sets initial hidden state before paint to avoid flash-of-visible-content.
const useSafeLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function MotionSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useSafeLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px) translateZ(0)';
    el.style.willChange = 'opacity, transform';
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => {
      el.style.transition = `opacity 0.45s ease-out ${delay}s, transform 0.45s ease-out ${delay}s`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) translateZ(0)';
      // Clean up will-change after animation to free compositor resources
      setTimeout(() => { el.style.willChange = 'auto'; }, (delay + 0.5) * 1000);
    };

    // If element is already in viewport on mount, animate immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return <div ref={ref}>{children}</div>;
}
