import type { Metadata } from 'next';
import { Target, Eye, HeartHandshake, Sparkles, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'About SMG',
  description:
    'SMG Transport Agency is a youth-driven Ghanaian transport company making intercity travel affordable, reliable and comfortable.',
};

const VALUES = [
  { icon: ShieldCheck, title: 'Safety first', body: 'Well-maintained buses and professional drivers on every journey.' },
  { icon: HeartHandshake, title: 'Customer-friendly', body: 'Warm, helpful service from booking to arrival.' },
  { icon: Sparkles, title: 'Transparency', body: 'Clear prices, timings and policies — no surprises.' },
  { icon: Users, title: 'Youth energy', body: 'Bold, ambitious and driven to keep improving.' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About SMG Transport Agency"
        subtitle="A youth-driven transport company reimagining intercity travel across Ghana."
      />

      <div className="container-page py-12">
        <div className="grid items-start gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 text-navy/80">
            <h2 className="text-2xl font-extrabold text-navy">Our story</h2>
            <p>
              SMG Transport Agency was founded by Gabriel Atuobi, a University of Cape Coast graduate, with a
              bold vision: to redefine intercity and intra-city transportation in Ghana. We set out to make
              travel affordable, reliable, comfortable and genuinely customer-friendly — especially for
              students, young professionals and families.
            </p>
            <p>
              Though we are a young company, we are growing a loyal customer base by leaning into technology
              and a relentless focus on service. This digital booking platform is the next step: real-time
              seat selection, transparent pricing and secure payments, all from your phone or computer.
            </p>
            <p className="text-sm text-muted-foreground">
              We are your travel partner — not just a transport company.
            </p>
          </div>

          {/* PLACEHOLDER: CEO photograph — to be supplied before launch. */}
          <Card>
            <CardContent className="p-6">
              <div className="grid h-44 place-items-center rounded-lg bg-cloud text-sm text-muted-foreground">
                CEO photo placeholder
              </div>
              <p className="mt-4 font-heading text-lg font-bold text-navy">Gabriel Atuobi</p>
              <p className="text-sm text-muted-foreground">Founder &amp; Student Chief Executive Officer</p>
              <p className="mt-3 text-sm text-navy/80">
                &ldquo;Every journey should be stress-free, affordable and comfortable. That belief drives
                everything we build.&rdquo;
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-navy"><Target className="size-5 text-gold" /><h3 className="font-heading text-lg font-bold">Our mission</h3></div>
              <p className="mt-2 text-sm text-navy/80">
                To redefine intercity travel in Ghana with technology, transparency and genuine customer care —
                delivering safe, affordable and comfortable journeys for everyone.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-navy"><Eye className="size-5 text-gold" /><h3 className="font-heading text-lg font-bold">Our vision</h3></div>
              <p className="mt-2 text-sm text-navy/80">
                To become a trusted, technology-led transport brand connecting Ghanaian cities and communities,
                known for reliability and a customer-first experience.
              </p>
            </CardContent>
          </Card>
        </div>

        <h3 className="mt-14 text-center text-2xl font-extrabold text-navy">What we value</h3>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v) => (
            <Card key={v.title}>
              <CardContent className="p-6">
                <div className="grid size-11 place-items-center rounded-lg bg-navy text-gold"><v.icon className="size-5" /></div>
                <h4 className="mt-4 font-bold text-navy">{v.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Company story and quotes are drafted placeholders pending CEO approval.
        </p>
      </div>
    </>
  );
}
