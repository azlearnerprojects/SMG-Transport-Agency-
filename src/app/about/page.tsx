import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getDb } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { buildRouteMetadata } from '@/lib/seo';

export const metadata = buildRouteMetadata('/about');

function Paragraphs({ body }: { body: string }) {
  return (
    <div className="space-y-4 leading-7 text-navy/80">
      {body
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
    </div>
  );
}

export default async function AboutPage() {
  const db = getDb();
  const [about, mission, vision, values] = await Promise.all([
    db.getContentPage('about'),
    db.getContentPage('mission'),
    db.getContentPage('vision'),
    db.getContentPage('values'),
  ]);

  const visibleAbout = about?.published ? about : undefined;
  const sections = [mission, vision, values].filter((page) => page?.published);

  return (
    <>
      <PageHeader
        title={visibleAbout?.title ?? 'About SMG Transport Agency'}
        subtitle="Company information is managed from the admin dashboard."
      />

      <div className="container-page py-12">
        {visibleAbout ? (
          <div className="max-w-3xl">
            <Paragraphs body={visibleAbout.body} />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-white p-10 text-center">
            <p className="font-semibold text-navy">Company content is being updated</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Please contact SMG support for company details while this page is prepared.
            </p>
            <Link href="/contact" className="mt-5 inline-flex">
              <Button variant="outline">Contact support</Button>
            </Link>
          </div>
        )}

        {sections.length > 0 && (
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {sections.map((page) => (
              <section key={page!.id} className="rounded-lg border border-border bg-white p-6 shadow-card">
                <h2 className="text-xl font-extrabold text-navy">{page!.title}</h2>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  <Paragraphs body={page!.body} />
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-lg border border-border bg-cloud p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h2 className="text-xl font-extrabold text-navy">Ready to travel?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Search published routes and departures from the booking page.</p>
          </div>
          <Link href="/book" className="mt-5 inline-flex md:mt-0">
            <Button>
              Book a trip <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
