'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import { siteConfig } from '@/content/site';

const mobileMenuItems: { href: Route; label: string }[] = [
  { href: '/', label: 'Home' },
  { href: '/tre4', label: 'BPSC TRE 4' },
  { href: '/tre4/topics', label: 'Browse Topics' },
  { href: '/tre4/daily', label: 'Daily Tests' },
  { href: '/tre4/history', label: 'My Attempts' },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <header
      ref={menuRef}
      className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm"
    >
      <div className="container flex h-14 sm:h-16 items-center justify-between">
        {/* Logo — square icon on mobile, horizontal logo on desktop */}
        <Link href="/" className="flex items-center shrink-0" aria-label="GAUSI — Home">
          {/* Mobile: square icon (compact, no text) */}
          <Image
            src="/branding/gausi-icon-512.png"
            alt="GAUSI"
            width={44}
            height={44}
            className="md:hidden h-9 w-9 rounded-xl"
            priority
          />
          {/* Desktop: full horizontal logo */}
          <Image
            src="/branding/gausi-logo-navbar.png"
            alt="GAUSI — Government Aspirants' Unified Study Institute"
            width={240}
            height={120}
            className="hidden md:block h-11 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav — hidden below md */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium"
          aria-label="Main navigation"
        >
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

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Desktop CTAs — hidden below md */}
          <Link
            href={siteConfig.cta.secondary.href}
            className="hidden md:inline-flex btn-secondary text-sm py-2"
          >
            {siteConfig.cta.secondary.label}
          </Link>
          <Link
            href={siteConfig.cta.primary.href}
            className="hidden md:inline-flex btn-primary text-sm py-2"
          >
            {siteConfig.cta.primary.label}
          </Link>

          {/* Mobile hamburger — visible below md only */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:text-brand-700 hover:bg-slate-100 transition-colors"
          >
            {menuOpen ? (
              /* X icon */
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="md:hidden border-t border-slate-100 bg-white shadow-lg"
        >
          <nav className="container py-3 flex flex-col gap-0.5" aria-label="Mobile navigation">
            {mobileMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-brand-700'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Primary CTA */}
            <div className="pt-2 pb-1">
              <Link
                href={siteConfig.cta.primary.href}
                onClick={() => setMenuOpen(false)}
                className="block w-full text-center btn-primary text-sm py-2.5"
              >
                {siteConfig.cta.primary.label}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
