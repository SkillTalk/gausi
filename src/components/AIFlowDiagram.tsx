"use client";
import { motion } from 'framer-motion';

export function AIFlowDiagram() {
  return (
    <div className="card p-6">
      <svg viewBox="0 0 600 160" className="w-full h-36">
        <defs>
          <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <motion.circle cx="60" cy="80" r="20" fill="#0F1A2E" stroke="url(#line)" strokeWidth="3" initial={{ scale: 0.9 }} animate={{ scale: [0.95, 1, 0.95] }} transition={{ repeat: Infinity, duration: 2 }} />
        <motion.circle cx="230" cy="80" r="20" fill="#0F1A2E" stroke="url(#line)" strokeWidth="3" initial={{ scale: 0.9 }} animate={{ scale: [0.95, 1, 0.95] }} transition={{ repeat: Infinity, duration: 2, delay: 0.2 }} />
        <motion.circle cx="400" cy="80" r="20" fill="#0F1A2E" stroke="url(#line)" strokeWidth="3" initial={{ scale: 0.9 }} animate={{ scale: [0.95, 1, 0.95] }} transition={{ repeat: Infinity, duration: 2, delay: 0.4 }} />
        <motion.circle cx="570" cy="80" r="20" fill="#0F1A2E" stroke="url(#line)" strokeWidth="3" initial={{ scale: 0.9 }} animate={{ scale: [0.95, 1, 0.95] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} />
        <motion.line x1="80" y1="80" x2="210" y2="80" stroke="url(#line)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
        <motion.line x1="250" y1="80" x2="380" y2="80" stroke="url(#line)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.2 }} />
        <motion.line x1="420" y1="80" x2="550" y2="80" stroke="url(#line)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.4 }} />
        <text x="40" y="125" fill="#A5B4FC" fontSize="12">Crawl</text>
        <text x="205" y="125" fill="#A5B4FC" fontSize="12">Analyze</text>
        <text x="370" y="125" fill="#A5B4FC" fontSize="12">Prioritize</text>
        <text x="545" y="125" fill="#A5B4FC" fontSize="12">Ship</text>
      </svg>
    </div>
  );
}


