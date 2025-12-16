"use client";
import Link from 'next/link';
import { siteConfig } from '@/content/content';

export function StickyAuditCTA() {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-white/10 bg-navy-900/80 backdrop-blur">
      <div className="container py-3">
        <Link href={siteConfig.cta.primary.href} className="btn-primary w-full block text-center">
          {siteConfig.cta.primary.label}
        </Link>
      </div>
    </div>
  );
}


