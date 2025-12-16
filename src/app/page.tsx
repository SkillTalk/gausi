import Image from 'next/image';
import { Metadata } from 'next';
import { siteConfig, services as servicesData } from '@/content/content';
import { Button } from '@/components/Button';
import { SectionHeading } from '@/components/SectionHeading';
import { ServiceCard } from '@/components/ServiceCard';
import { TestimonialCard } from '@/components/TestimonialCard';
import { CTABanner } from '@/components/CTABanner';
import { Stats } from '@/components/Stats';
import { ProcessSteps } from '@/components/ProcessSteps';

export const metadata: Metadata = {
  title: 'Home',
  description: siteConfig.subtext
};

export default function HomePage() {
  const testimonials = [
    { quote: 'Our website started getting consistent leads within 8 weeks.', author: 'Local Business Owner' },
    { quote: 'Clear reporting and honest communication. Great SEO partner.', author: 'Startup Founder' },
    { quote: 'Rank improvements and better traffic quality.', author: 'E-commerce Manager' }
  ];
  const steps = ['Audit & Research', 'Strategy & Roadmap', 'Execution (On-page, Content, Links)', 'Reporting & Iteration'];

  return (
    <>
      <section className="container pt-14 md:pt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
              {siteConfig.taglineMain}
            </h1>
            <p className="mt-4 text-white/80 max-w-2xl">{siteConfig.subtext}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href={siteConfig.cta.primary.href}>{siteConfig.cta.primary.label}</Button>
              <Button href={siteConfig.cta.secondary.href} variant="secondary">
                {siteConfig.cta.secondary.label}
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm text-white/60">
              {siteConfig.taglines.map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-electric-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="card p-6">
              <Image src="/hero-placeholder.svg" alt="Marketing growth" width={640} height={420} className="w-full h-auto" />
            </div>
          </div>
        </div>
        <div className="mt-10">
          <Stats items={siteConfig.stats} />
        </div>
      </section>

      <section className="container mt-20">
        <SectionHeading title="Our Services" subtitle="Practical, transparent, and results-focused." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {servicesData.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
      </section>

      <section className="container mt-20">
        <SectionHeading title="Why Gausidhi" subtitle="Simple strategies. Real results." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { title: 'Proven 90-day plan', desc: 'Focused execution with clear weekly deliverables.' },
            { title: 'Transparent reporting', desc: 'Know exactly what’s shipped and what’s next.' },
            { title: 'Built for small teams', desc: 'No fluff—just practical SEO and growth.' }
          ].map((b) => (
            <div key={b.title} className="card p-6">
              <div className="text-lg font-semibold">{b.title}</div>
              <p className="mt-2 text-white/80">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mt-20">
        <SectionHeading title="Process" subtitle="Clarity from day one." />
        <ProcessSteps steps={steps} />
      </section>

      <section className="container mt-20">
        <SectionHeading title="What clients say" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <TestimonialCard key={t.author} quote={t.quote} author={t.author} />
          ))}
        </div>
      </section>

      <CTABanner />
    </>
  );
}


