import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { siteConfig } from '@/content/site';
import { PageTransition } from '@/components/PageTransition';
import { Analytics } from '@/components/Analytics';

const inter = Inter({ subsets: ['latin'] });

// Correct Next.js App Router viewport export — keeps width=device-width,
// initial-scale=1 so the page fits the physical screen width on first load.
// viewport-fit=cover enables env(safe-area-inset-*) on notched iPhones.
// We intentionally omit maximum-scale / user-scalable to preserve accessibility.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `GAUSI | Government Exam Preparation`,
    template: `%s | GAUSI`,
  },
  description: siteConfig.description,
  openGraph: {
    type: 'website',
    url: siteConfig.url,
    title: `GAUSI — ${siteConfig.fullForm}`,
    description: siteConfig.description,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: 'GAUSI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `GAUSI — ${siteConfig.fullForm}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: `GAUSI — ${siteConfig.fullForm}`,
    alternateName: 'GAUSI',
    url: siteConfig.url,
    description: siteConfig.description,
  };

  return (
    <html lang="hi">
      <body className={inter.className}>
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        <Navbar />
        <main className="min-h-screen">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
      </body>
    </html>
  );
}
