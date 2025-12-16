import { Metadata } from 'next';
import { SectionHeading } from '@/components/SectionHeading';
import { FreeAuditForm } from '@/components/FreeAuditForm';

export const metadata: Metadata = {
  title: 'Free Audit',
  description: 'Get a free SEO audit and a simple action plan.'
};

export default function FreeAuditPage() {
  const checklist = [
    'Technical health snapshot',
    'Keyword and opportunity highlights',
    'On-page improvement list',
    'Top 3 actions for next 30 days'
  ];

  return (
    <section className="container pt-10">
      <SectionHeading title="Free SEO Audit" subtitle="A practical checklist you can use right away." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FreeAuditForm />
        <div className="card p-6">
          <h3 className="font-semibold">You will receive</h3>
          <ul className="mt-3 space-y-2 text-white/80">
            {checklist.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-electric-500" />
                {c}
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/50 mt-4">This is a manual review. Expect 24–48 hours.</p>
        </div>
      </div>
    </section>
  );
}


