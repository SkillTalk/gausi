\"use client\";
import Link from 'next/link';
import type { Route } from 'next';
import { Service } from '@/content/content';
import { motion } from 'framer-motion';

export function ServiceCard({ service }: { service: Service }) {
  return (
    <motion.div
      className="card p-6 transition"
      whileHover={{ y: -4, boxShadow: '0 0 24px rgba(99,102,241,0.35)' }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      <h3 className="text-lg font-semibold">{service.title}</h3>
      <p className="mt-2 text-white/80">{service.short}</p>
      <ul className="mt-4 space-y-1 text-white/80">
        {service.deliverables.slice(0, 4).map((d) => (
          <li key={d} className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-electric-500" />
            {d}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-white/70">{service.startingPrice}</span>
        <Link href={`/services/${service.slug}` as Route} className="text-electric-400 hover:text-electric-300">
          Learn more →
        </Link>
      </div>
    </motion.div>
  );
}


