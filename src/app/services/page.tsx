import { Metadata } from 'next';
import { services } from '@/content/content';
import { SectionHeading } from '@/components/SectionHeading';
import { ServiceCard } from '@/components/ServiceCard';
import { CTABanner } from '@/components/CTABanner';

export const metadata: Metadata = {
  title: 'Services',
  description: 'SEO, Local SEO, Content Strategy, Social Media Marketing, Google Ads'
};

export default function ServicesPage() {
  return (
    <>
      <section className="container pt-10">
        <SectionHeading title="Services" subtitle="Choose the growth path that fits your goals." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {services.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </section>
      <section className="container mt-14">
        <div className="card p-6">
          <h3 className="text-xl font-semibold">What you get</h3>
          <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-white/80">
            {[
              'Clear weekly updates',
              'Transparent reporting',
              'Practical, doable tasks',
              'Compounding organic growth'
            ].map((d) => (
              <li key={d} className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-electric-500" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CTABanner />
    </>
  );
}


