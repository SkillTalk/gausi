import { Button } from './Button';
import { siteConfig } from '@/content/content';

export function CTABanner() {
  return (
    <section className="container mt-16">
      <div className="card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-electric-700/20 to-cyan-500/10" />
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Ready to grow?</h3>
            <p className="text-white/80 mt-1">Get a free, practical audit with clear next steps.</p>
          </div>
          <div className="flex gap-3">
            <Button href={siteConfig.cta.primary.href}>Get a Free Audit</Button>
            <Button href={siteConfig.cta.secondary.href} variant="secondary">Book a Call</Button>
          </div>
        </div>
      </div>
    </section>
  );
}


