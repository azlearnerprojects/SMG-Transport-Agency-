import Link from 'next/link';
import { ArrowRight, CheckCircle2, MapPin, MessageCircle, Phone } from 'lucide-react';
import { getDb } from '@/lib/db';
import { getPublicSiteConfig } from '@/lib/site-config';
import { formatCurrency } from '@/lib/format';
import { isPublicRoute } from '@/lib/public-data';
import { Button } from '@/components/ui/button';
import { SearchCard } from '@/components/booking/search-card';
import { buildHomeStructuredData, serializeJsonLd } from '@/lib/seo';
import type { Route, Schedule } from '@/lib/types';

function routeLabel(route: Route) {
  return `${route.origin} to ${route.destination}`;
}

function normalizeRouteName(value: string) {
  return value.trim().toLowerCase().replace(/\s*(->|→)\s*/g, ' to ');
}

function startingFare(route: Route, schedules: Schedule[]) {
  const fares = schedules.filter((schedule) => schedule.routeId === route.id).map((schedule) => schedule.fares.standard);
  return fares.length ? Math.min(...fares) : 0;
}

export default async function HomePage() {
  const db = getDb();
  const [cities, routes, schedules, allFaqs, promotions, announcements, { config: site }] = await Promise.all([
    db.getCities(),
    db.listRoutes(),
    db.listSchedules(),
    db.listFaqs(),
    db.listPromotions(),
    db.listAnnouncements(),
    getPublicSiteConfig(),
  ]);

  const publicRoutes = routes.filter(isPublicRoute);
  const featuredRouteOrder = new Map(site.featuredRoutes.map((name, index) => [normalizeRouteName(name), index]));
  const configuredRoutes = site.featuredRoutes.length
    ? publicRoutes.filter((route) => featuredRouteOrder.has(normalizeRouteName(routeLabel(route))))
    : [];
  const routePool = configuredRoutes.length ? configuredRoutes : publicRoutes.filter((route) => route.popular);

  const popular = routePool
    .sort((a, b) => {
      const aOrder = featuredRouteOrder.get(normalizeRouteName(routeLabel(a))) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = featuredRouteOrder.get(normalizeRouteName(routeLabel(b))) ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    })
    .map((route) => ({ route, from: startingFare(route, schedules) }))
    .slice(0, 6);

  const faqs = allFaqs
    .filter((faq) => faq.published)
    .sort((a, b) => a.order - b.order)
    .slice(0, 4);

  const now = Date.now();
  const activePromo = promotions.find(
    (promo) => promo.active && new Date(promo.startsAt).getTime() <= now && new Date(promo.endsAt).getTime() >= now,
  );
  const activeAnnouncement = announcements
    .filter((announcement) => new Date(announcement.publishedAt).getTime() <= now)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
  const jsonLd = serializeJsonLd(buildHomeStructuredData(site));

  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="container-page grid gap-8 py-12 md:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">{site.homeEyebrow}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
              {site.tagline}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {site.homeIntro}
            </p>

            {site.homeHighlights.length > 0 && (
              <ul className="mt-6 grid gap-3 text-sm text-navy sm:grid-cols-2">
                {site.homeHighlights.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-gold-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/book">
                <Button size="lg">
                  Book a trip <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/routes">
                <Button variant="outline" size="lg">View routes</Button>
              </Link>
            </div>
          </div>

          <SearchCard cities={cities} />
        </div>
      </section>

      {activeAnnouncement && (
        <section className="border-b border-border bg-cloud">
          <div className="container-page py-4">
            <div className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-navy shadow-card">
              <strong>{activeAnnouncement.title}:</strong> {activeAnnouncement.body}
            </div>
          </div>
        </section>
      )}

      <section className="container-page py-12 md:py-14">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">{site.homeRoutesTitle}</h2>
            {site.homeRoutesIntro && <p className="mt-2 max-w-2xl text-muted-foreground">{site.homeRoutesIntro}</p>}
          </div>
          <Link href="/routes">
            <Button variant="outline" size="sm">
              View all <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        {popular.length > 0 ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map(({ route, from }) => (
              <article key={route.id} className="rounded-lg border border-border bg-white p-5 shadow-card">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4 text-gold-600" />
                  <span>{route.distanceKm} km</span>
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-navy">{route.origin} to {route.destination}</h3>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {from > 0 ? <>From <span className="font-bold text-navy">{formatCurrency(from)}</span></> : 'Departures soon'}
                  </p>
                  <Link
                    href={`/book?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}`}
                  >
                    <Button size="sm">Book</Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
            Routes will appear here when they are published in the admin dashboard.
          </p>
        )}
      </section>

      <section className="border-y border-border bg-cloud py-12 md:py-14">
        <div className="container-page grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">{site.homeBenefitsTitle}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {site.homeBenefits.map((benefit) => (
              <article key={benefit.title} className="rounded-lg border border-border bg-white p-5">
                <h3 className="text-base font-extrabold text-navy">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {activePromo && (
        <section className="container-page py-12">
          <div className="rounded-lg border border-gold-200 bg-gold-50 p-6 md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <h2 className="text-xl font-extrabold text-navy">{activePromo.title}</h2>
              <p className="mt-2 text-sm leading-6 text-navy/75">
                Use code <strong>{activePromo.code}</strong>. {activePromo.description}
              </p>
            </div>
            <Link href="/promotions" className="mt-4 inline-flex md:mt-0">
              <Button variant="navy">See promotions</Button>
            </Link>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="container-page max-w-3xl py-12 md:py-14">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold md:text-3xl">{site.homeFaqTitle}</h2>
            {site.homeFaqIntro && <p className="mt-2 text-muted-foreground">{site.homeFaqIntro}</p>}
          </div>
          <div className="mt-7 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.id} className="group rounded-lg border border-border bg-white p-4">
                <summary className="cursor-pointer list-none font-semibold text-navy [&::-webkit-details-marker]:hidden">
                  {faq.question}
                </summary>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/faq">
              <Button variant="outline">See all FAQs</Button>
            </Link>
          </div>
        </section>
      )}

      <section className="container-page pb-14">
        <div className="rounded-lg border border-border bg-navy p-6 text-white md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h2 className="text-xl font-extrabold text-white">{site.homeSupportTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">{site.homeSupportBody}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-2">
                <Phone className="size-4 text-gold" />
                {site.supportPhone}
              </span>
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="size-4 text-gold" />
                {site.supportHours}
              </span>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-0">
            <Link href="/contact">
              <Button>Contact us</Button>
            </Link>
            <Link href="/manage">
              <Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                Manage booking
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
