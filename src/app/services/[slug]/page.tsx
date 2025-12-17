import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { services } from '@/content/content';
import { Button } from '@/components/Button';
import { AIFlowDiagram } from '@/components/AIFlowDiagram';
import { MotionSection } from '@/components/MotionSection';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const service = services.find((s) => s.slug === params.slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.description
  };
}

export default function ServiceDetailPage({ params }: Props) {
  const service = services.find((s) => s.slug === params.slug);
  if (!service) return notFound();

  return (
    <section className="container pt-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">{service.title}</h1>
        <p className="mt-3 text-white/80">{service.description}</p>
        <div className="mt-6 flex gap-3">
          <Button href="/free-audit">Get a Free Audit</Button>
          <Button href="/contact" variant="secondary">Book a Call</Button>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold">Outcomes</h2>
          <ul className="mt-3 space-y-2 text-white/80">
            {service.outcomes.map((o) => (
              <li key={o} className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-electric-500" />
                {o}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Deliverables</h2>
          <ul className="mt-3 space-y-2 text-white/80">
            {service.deliverables.map((d) => (
              <li key={d} className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-electric-500" />
                {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold">Scope</h2>
          <ul className="mt-3 space-y-2 text-white/80">
            <li><strong>Timeline:</strong> {service.timeline}</li>
            <li><strong>Starting Price:</strong> {service.startingPrice}</li>
          </ul>
        </div>
      </div>

      <MotionSection>
        <div className="mt-10">
          <h2 className="font-semibold mb-3">AI Workflow</h2>
          <AIFlowDiagram />
        </div>
      </MotionSection>

      {service.faq && service.faq.length > 0 ? (
        <div className="mt-10 card p-6">
          <h2 className="font-semibold">FAQs</h2>
          <ul className="mt-3 space-y-3 text-white/80">
            {service.faq.slice(0, 4).map((f) => (
              <li key={f.q}>
                <div className="font-medium">{f.q}</div>
                <div className="text-white/80">{f.a}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}


