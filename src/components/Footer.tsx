import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/content/site';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container py-10 text-sm text-slate-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Image
              src="/branding/gausi-logo-navbar.png"
              alt="GAUSI"
              width={160}
              height={80}
              className="h-8 w-auto mb-2"
            />
            <div className="font-extrabold text-brand-700 text-base">{siteConfig.name}</div>
            <p className="text-xs text-slate-500 mt-0.5 mb-1 leading-snug">
              {siteConfig.fullForm}
            </p>
            <p className="text-xs font-semibold text-brand-600 tracking-wide mb-3">
              {siteConfig.tagline}
            </p>
            <p className="max-w-xs leading-relaxed text-slate-500 text-sm">
              Free daily practice tests for BPSC TRE 4 and government exams. Available in Hindi & English.
            </p>
            <p className="mt-3">
              Email:{' '}
              <a href={`mailto:${siteConfig.contact.email}`} className="underline hover:text-slate-900">
                {siteConfig.contact.email}
              </a>
            </p>
          </div>

          <div>
            <div className="font-semibold text-slate-700 mb-3">Exams</div>
            <ul className="space-y-2">
              <li><Link href="/tre4" className="hover:text-slate-900 transition-colors">BPSC TRE 4</Link></li>
              <li><Link href="/tre4/daily" className="hover:text-slate-900 transition-colors">Daily Tests</Link></li>
              <li><Link href="/tre4/topics" className="hover:text-slate-900 transition-colors">Topic-wise Practice</Link></li>
              <li><Link href="/tre4/history" className="hover:text-slate-900 transition-colors">My Attempts</Link></li>
              <li><Link href="/tre4/revision" className="hover:text-slate-900 transition-colors">Revision List</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-semibold text-slate-700 mb-3">Legal</div>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Use</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p>Practice questions are for educational purposes only.</p>
        </div>
      </div>
    </footer>
  );
}
