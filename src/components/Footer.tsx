import Link from 'next/link';
import { siteConfig } from '@/content/content';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="container py-10 text-sm text-white/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="font-semibold text-white">{siteConfig.name}</div>
            <p className="mt-2 max-w-sm">
              {siteConfig.taglines[1]} {siteConfig.taglines[2]}
            </p>
            <p className="mt-3">
              Email: <a href={`mailto:${siteConfig.contact.email}`} className="underline">{siteConfig.contact.email}</a>
            </p>
            <p>Location: {siteConfig.contact.location}</p>
          </div>
          <div>
            <div className="font-semibold text-white">Quick Links</div>
            <ul className="mt-2 space-y-2">
              <li><Link href="/services" className="hover:text-white">Services</Link></li>
              <li><Link href="/case-studies" className="hover:text-white">Case Studies</Link></li>
              <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              <li><Link href="/about" className="hover:text-white">About</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white">Legal</div>
            <ul className="mt-2 space-y-2">
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between">
          <p className="text-white/50">&copy; {new Date().getFullYear()} {siteConfig.name}</p>
          <div className="flex gap-4">
            <a href={siteConfig.social.twitter} className="hover:text-white">Twitter</a>
            <a href={siteConfig.social.linkedin} className="hover:text-white">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}


