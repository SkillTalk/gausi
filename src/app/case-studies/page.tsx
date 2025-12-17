import { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { caseStudies } from '@/content/content';
import { SectionHeading } from '@/components/SectionHeading';
import { CTABanner } from '@/components/CTABanner';

export const metadata: Metadata = {
  title: 'Case Studies',
  description: 'Realistic examples of problems, approaches, and results.'
};

export default function CaseStudiesPage() {
  return (
    <>
      <section className="container pt-10">
        <SectionHeading title="Case Studies" subtitle="Problem → Approach → Result." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {caseStudies.map((cs) => (
            <Link key={cs.slug} href={`/case-studies/${cs.slug}` as Route} className="card p-6 hover:translate-y-[-2px] transition">
              <div className="text-sm text-white/60">{cs.industry}</div>
              <h3 className="mt-1 text-lg font-semibold">{cs.title}</h3>
              <p className="mt-2 text-white/80">{cs.problem}</p>
              <div className="mt-4 text-sm text-electric-400">Read case study →</div>
            </Link>
          ))}
        </div>
      </section>
      <CTABanner />
    </>
  );
}


