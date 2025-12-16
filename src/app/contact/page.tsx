import { Metadata } from 'next';
import { siteConfig } from '@/content/content';
import { SectionHeading } from '@/components/SectionHeading';
import { ContactForm } from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact us for SEO, content, social media, and ads.'
};

export default function ContactPage() {
  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteConfig.name,
    email: siteConfig.contact.email,
    url: siteConfig.url,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN'
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }} />
      <section className="container pt-10">
        <SectionHeading title="Contact Us" subtitle="We usually reply within 24 hours." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ContactForm />
          <div className="card p-6">
            <h3 className="font-semibold">Contact Details</h3>
            <p className="mt-2 text-white/80">
              Email: <a className="underline" href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
            </p>
            <p className="text-white/80">Location: {siteConfig.contact.location}</p>
            <a href={siteConfig.contact.whatsapp} target="_blank" className="btn-secondary mt-4 inline-flex">
              WhatsApp us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}


