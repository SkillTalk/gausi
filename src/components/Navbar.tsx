import Link from 'next/link';
import { siteConfig } from '@/content/site';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-extrabold text-brand-700 tracking-tight text-lg">
            {siteConfig.name}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
            {siteConfig.tagline}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" aria-label="Main navigation">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-slate-600 hover:text-brand-700 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Link href={siteConfig.cta.secondary.href} className="hidden md:inline-flex btn-secondary text-sm py-2">
            {siteConfig.cta.secondary.label}
          </Link>
          <Link href={siteConfig.cta.primary.href} className="btn-primary text-sm py-2">
            {siteConfig.cta.primary.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
