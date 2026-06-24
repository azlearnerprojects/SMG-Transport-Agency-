import { PageHeader } from './page-header';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

/** Shared layout for policy/legal pages with clean, readable typography. */
export function LegalContent({
  title,
  subtitle,
  sections,
  note,
}: {
  title: string;
  subtitle?: string;
  sections: LegalSection[];
  note?: string;
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <article className="container-page max-w-3xl py-12">
        {sections.map((s, i) => (
          <section key={s.heading} className={i > 0 ? 'mt-8' : ''}>
            <h2 className="font-heading text-xl font-bold text-navy">{s.heading}</h2>
            {s.paragraphs.map((p, j) => (
              <p key={j} className="mt-3 text-sm leading-relaxed text-navy/80">
                {p}
              </p>
            ))}
        </section>
        ))}
        <p className="mt-10 rounded-md border border-dashed border-border bg-cloud p-4 text-xs text-muted-foreground">
          {note ??
            'This is standard template policy content for the preview site. It should be reviewed before a full public launch.'}
        </p>
      </article>
    </>
  );
}
