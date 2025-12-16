import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';
import { StickyAuditCTA } from '@/components/StickyAuditCTA';
import { siteConfig } from '@/content/content';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.taglines[0]}`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.subtext,
  openGraph: {
    type: 'website',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.subtext,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }]
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.subtext,
    images: [siteConfig.ogImage]
  },
  alternates: {
    canonical: '/'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.svg`,
    sameAs: [siteConfig.social.twitter, siteConfig.social.linkedin].filter(Boolean)
  };

  // Placeholder GA4: add your measurement ID and uncomment to enable
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     // Initialize GA4 here
  //   }
  // }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <FloatingWhatsApp />
        <StickyAuditCTA />
      </body>
    </html>
  );
}


