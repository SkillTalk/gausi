import Link from 'next/link';
import { siteConfig } from '@/content/content';
import { Button } from './Button';
import Image from 'next/image';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-900/70 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.svg" alt={siteConfig.name} width={28} height={28} priority />
          <span className="font-semibold tracking-tight">{siteConfig.name}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-white/80 hover:text-white transition">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex">
          <Button href={siteConfig.cta.primary.href}>{siteConfig.cta.primary.label}</Button>
        </div>
        <div className="md:hidden">
          <Button href={siteConfig.cta.primary.href} variant="secondary" className="text-xs py-2 px-3">
            Free Audit
          </Button>
        </div>
      </div>
    </header>
  );
}


