import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = {
  title: 'FAQs',
  description: 'Answers to common questions about booking, payments, tickets and travel with SMG.',
};

export default function FaqPage() {
  const db = getDb();
  const faqs = db.listFaqs();
  const categories = [...new Set(faqs.map((f) => f.category))];

  // FAQ structured data for rich results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <>
      <PageHeader title="Frequently Asked Questions" subtitle="Everything you need to know about booking and travelling with SMG." />
      <div className="container-page max-w-3xl py-12">
        {categories.map((cat) => (
          <section key={cat} className="mb-10">
            <h2 className="mb-4 font-heading text-lg font-bold text-navy">{cat}</h2>
            <div className="space-y-3">
              {faqs
                .filter((f) => f.category === cat)
                .map((f) => (
                  <details key={f.id} className="group rounded-lg border border-border bg-white p-4">
                    <summary className="cursor-pointer list-none font-semibold text-navy [&::-webkit-details-marker]:hidden">
                      {f.question}
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground">{f.answer}</p>
                  </details>
                ))}
            </div>
          </section>
        ))}
        <p className="text-xs text-muted-foreground">FAQ content is editable in the admin CMS and pending final review.</p>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
