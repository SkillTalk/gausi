"use client";
import { motion } from 'framer-motion';

export function AISummary({ excerpt }: { excerpt: string }) {
  return (
    <motion.div
      className="card p-5 mb-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="text-sm uppercase tracking-wide text-white/60">AI Summary</div>
      <p className="mt-2 text-white/85">
        {excerpt} This article distills key actions and machine-assisted tactics you can apply today.
      </p>
    </motion.div>
  );
}


