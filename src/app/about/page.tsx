import { Metadata } from 'next';
import { SectionHeading } from '@/components/SectionHeading';
import { CTABanner } from '@/components/CTABanner';

export const metadata: Metadata = {
  title: 'About',
  description: 'Our story, mission, and why clients trust us.'
};

export default function AboutPage() {
  return (
    <>
      <section className="container pt-10">
        <SectionHeading title="Our Story" subtitle="Gausi — clarity and growth." />
        <div className="prose max-w-3xl mx-auto">
          <p>
             Digital Marketing helps startups and local businesses grow with simple, transparent SEO and growth marketing.
          </p>
          <p>
            “Gausi” represents focus and discipline — we prioritize clarity, practical steps, and consistent execution over fluff.
          </p>
          <h3>Mission</h3>
          <p>Deliver compounding organic growth with honest communication and measurable outcomes.</p>
          <h3>Values</h3>
          <ul>
            <li>Clarity over complexity</li>
            <li>Consistency over hacks</li>
            <li>Results over vanity metrics</li>
          </ul>
          <h3>Why clients trust us</h3>
          <ul>
            <li>Clear 90-day plans and weekly updates</li>
            <li>Pragmatic audits and on-page improvements</li>
            <li>Transparent reporting and reliable delivery</li>
          </ul>
        </div>
      </section>
      <CTABanner />
    </>
  );
}


