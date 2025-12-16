import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { caseStudies } from '@/content/content';

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const cs = caseStudies.find((c) => c.slug === params.slug);
  if (!cs) return {};
  return {
    title: cs.title,
    description: cs.problem
  };
}

export default function CaseStudyDetailPage({ params }: Props) {
  const cs = caseStudies.find((c) => c.slug === params.slug);
  if (!cs) return notFound();
  return (
    <section className="container pt-10">
      <div className="max-w-3xl">
        <div className="text-sm text-white/60">{cs.industry}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{cs.title}</h1>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {cs.metrics.map((m) => (
            <div key={m.label} className="card p-5 text-center">
              <div className="text-2xl font-semibold">{m.value}</div>
              <div className="text-white/70 text-sm mt-1">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="prose mt-8">
          <h3>Problem</h3>
          <p>{cs.problem}</p>
          <h3>Approach</h3>
          <ul>
            {cs.approach.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <h3>Result</h3>
          <ul>
            {cs.result.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}


