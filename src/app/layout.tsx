import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { siteConfig } from '@/content/site';
import { PageTransition } from '@/components/PageTransition';
import { Analytics } from '@/components/Analytics';

const inter = Inter({ subsets: ['latin'] });

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
  alternates: {
    canonical: '/',
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
