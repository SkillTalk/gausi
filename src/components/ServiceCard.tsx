import Link from 'next/link';
import { Service } from '@/content/content';

export function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="card p-6 hover:translate-y-[-2px] transition">
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
        <Link href={`/services/${service.slug}`} className="text-electric-400 hover:text-electric-300">
          Learn more →
        </Link>
      </div>
    </div>
  );
}


