\"use client\";
import { useState } from 'react';

export function FAQAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className=\"space-y-3\">
      {items.map((item, idx) => {
        const isOpen = open === idx;
        return (
          <div key={item.q} className=\"card\">
            <button
              className=\"w-full text-left px-5 py-4 flex items-center justify-between gap-3\"
              onClick={() => setOpen(isOpen ? null : idx)}
              aria-expanded={isOpen}
            >
              <span className=\"font-medium\">{item.q}</span>
              <span className=\"text-white/60\">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div className=\"px-5 pb-5 text-white/80\">{item.a}</div>}
          </div>
        );
      })}
    </div>
  );
}


