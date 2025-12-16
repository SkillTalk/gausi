import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Gausidhi Digital Marketing terms of service.'
};

export default function TermsPage() {
  return (
    <section className="container pt-10">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <div className="prose mt-6 max-w-3xl">
        <p>By using this website or engaging our services, you agree to these terms.</p>
        <h3>Services</h3>
        <p>All services are provided on a best-effort basis with transparent communication.</p>
        <h3>Liability</h3>
        <p>We are not liable for indirect or consequential damages arising from the use of our services.</p>
        <h3>Contact</h3>
        <p>For any questions, contact us at hello@gausidigital.com.</p>
      </div>
    </section>
  );
}


