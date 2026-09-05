import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'GAUSI privacy policy — Government Aspirants\' Unified Study Institute.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <section className="container pt-10">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <div className="prose mt-6 max-w-3xl">
        <p>We value your privacy. We only collect information you provide to us voluntarily via forms or contact channels.</p>
        <h3>Data Usage</h3>
        <p>We use your information to respond to your inquiries and provide our services. We do not sell your data.</p>
        <h3>Analytics</h3>
        <p>Basic anonymous analytics may be used to improve our website experience.</p>
        <h3>Contact</h3>
        <p>For any questions, contact us at hello@gausidigital.com.</p>
      </div>
    </section>
  );
}


