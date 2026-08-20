import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/content/site';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="container flex h-16 items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0" aria-label="GAUSI — Home">
          <Image
            src="/branding/gausi-logo-navbar.png"
            alt="GAUSI — Government Aspirants' Unified Study Institute"
            width={240}
            height={120}
            className="h-9 w-auto sm:h-10 md:h-11"
            priority
          />
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
