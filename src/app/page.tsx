import Link from 'next/link';
import {
  ShieldCheck,
  Wallet,
  Clock,
  Armchair,
  Smartphone,
  QrCode,
  CheckCircle2,
  Bus,
  Star,
  CreditCard,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { getDb } from '@/lib/db';
import { BRAND } from '@/lib/config';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchCard } from '@/components/booking/search-card';

export default function HomePage() {
  const db = getDb();
  const cities = db.getCities();
  const routes = db.listRoutes();
  const schedules = db.listSchedules();
  const faqs = db.listFaqs().slice(0, 4);

  // Starting price per popular route = lowest standard fare across its schedules.
  const popular = routes
    .filter((r) => r.popular)
    .map((r) => {
      const fares = schedules.filter((s) => s.routeId === r.id).map((s) => s.fares.standard);
      return { route: r, from: fares.length ? Math.min(...fares) : 0 };
    })
    .slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section className="hero-gradient relative text-white">
        <div className="container-page grid gap-8 py-14 md:py-20 lg:grid-cols-2 lg:items-center">
          <div className="animate-fade-in">
            <Badge variant="gold" className="mb-4">Youth-driven • Ghana</Badge>
            <h1 className="font-heading text-4xl font-extrabold leading-tight text-white md:text-5xl">
              {BRAND.tagline}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/80">
              Book affordable and comfortable trips across Ghana with real-time seat selection and
              secure digital payments.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-gold" /> Real-time seats</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-gold" /> Mobile Money & cards</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-gold" /> Instant e-tickets</li>
            </ul>
          </div>
          <div className="lg:pl-6">
            <SearchCard cities={cities} />
          </div>
        </div>
      </section>

      {/* POPULAR ROUTES */}
      <section className="container-page py-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">Popular routes</h2>
            <p className="mt-2 text-muted-foreground">Frequently travelled intercity connections. (Sample routes.)</p>
          </div>
          <Link href="/routes" className="hidden sm:block">
            <Button variant="outline" size="sm">View all routes <ArrowRight className="size-4" /></Button>
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map(({ route, from }) => (
            <Card key={route.id} className="transition-shadow hover:shadow-card-hover">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4 text-gold" /> {route.distanceKm} km
                </div>
                <div className="mt-2 flex items-center gap-2 font-heading text-lg font-bold text-navy">
                  {route.origin} <ArrowRight className="size-4 text-gold" /> {route.destination}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    from <span className="text-lg font-bold text-navy">{formatCurrency(from)}</span>
                  </span>
                  <Link
                    href={`/book?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}`}
                  >
                    <Button size="sm">Book</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* WHY SMG */}
      <section className="bg-cloud py-14">
        <div className="container-page">
          <h2 className="text-center text-2xl font-extrabold md:text-3xl">Why travel with SMG</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Wallet, title: 'Affordable fares', body: 'Transparent pricing with no hidden charges — see your full breakdown before you pay.' },
              { icon: ShieldCheck, title: 'Safe & reliable', body: 'Professional drivers, well-maintained buses and clear safety practices on every trip.' },
              { icon: Armchair, title: 'Comfortable seats', body: 'Air-conditioned coaches with reclining seats and room to relax on longer journeys.' },
              { icon: Clock, title: 'On your time', body: 'Choose departures that fit your schedule and reserve your exact seat in seconds.' },
            ].map((f) => (
              <Card key={f.title} className="h-full">
                <CardContent className="p-6">
                  <div className="grid size-11 place-items-center rounded-lg bg-navy text-gold">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FLEET CATEGORIES */}
      <section className="container-page py-14">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold md:text-3xl">Travel your way</h2>
          <p className="mt-2 text-muted-foreground">Choose the comfort level that suits your journey and budget.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { name: 'Standard', icon: Bus, perks: ['Air conditioning', 'USB charging', 'Reclining seats'], variant: 'outline' as const },
            { name: 'Business', icon: Star, perks: ['Extra legroom', 'On-board WiFi', 'Refreshments'], variant: 'navy' as const },
            { name: 'VIP Executive', icon: Star, perks: ['Lounger seats', 'Entertainment', 'Priority boarding'], variant: 'gold' as const },
          ].map((tier) => (
            <Card key={tier.name} className="flex h-full flex-col">
              <CardContent className="flex flex-1 flex-col p-6">
                <Badge variant={tier.variant} className="w-fit">{tier.name}</Badge>
                <tier.icon className="mt-4 size-7 text-navy" />
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                  {tier.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-gold" /> {p}
                    </li>
                  ))}
                </ul>
                <Link href="/fleet" className="mt-5">
                  <Button variant="outline" className="w-full">Explore the fleet</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-navy py-14 text-white">
        <div className="container-page">
          <h2 className="text-center text-2xl font-extrabold text-white md:text-3xl">Book in three simple steps</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: 1, icon: MapPin, title: 'Search your trip', body: 'Pick your route, date and number of passengers, then compare departures.' },
              { n: 2, icon: Armchair, title: 'Choose your seat', body: 'Select your exact seat on an interactive map and add passenger details.' },
              { n: 3, icon: QrCode, title: 'Pay & get your ticket', body: 'Pay securely and receive an instant e-ticket with a QR code for boarding.' },
            ].map((s) => (
              <div key={s.n} className="rounded-lg border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-gold font-bold text-navy">{s.n}</span>
                  <s.icon className="size-5 text-gold" />
                </div>
                <h3 className="mt-4 font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-white/70">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/book"><Button size="lg">Start booking</Button></Link>
          </div>
        </div>
      </section>

      {/* PROMO BANNER */}
      <section className="container-page py-14">
        <div className="overflow-hidden rounded-xl bg-gold">
          <div className="flex flex-col items-start justify-between gap-4 p-8 md:flex-row md:items-center">
            <div>
              <h3 className="font-heading text-2xl font-extrabold text-navy">Early Bird — save 15%</h3>
              <p className="mt-1 text-navy/80">Book ahead with code <strong>EARLYBIRD</strong> and save on the base fare. (Sample promotion.)</p>
            </div>
            <Link href="/promotions"><Button variant="navy" size="lg">See all promotions</Button></Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS (placeholder) */}
      <section className="bg-cloud py-14">
        <div className="container-page">
          <h2 className="text-center text-2xl font-extrabold md:text-3xl">What travellers say</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Placeholder testimonials — to be replaced with real, consented customer reviews before launch.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { name: 'A. M.', city: 'Cape Coast', quote: 'Booking took less than two minutes and I picked my exact seat. Smooth trip to Accra.' },
              { name: 'K. B.', city: 'Kumasi', quote: 'Paying with Mobile Money was easy and my e-ticket arrived instantly. Will book again.' },
              { name: 'Y. A.', city: 'Takoradi', quote: 'Clean, comfortable bus and friendly staff. The whole experience felt professional.' },
            ].map((t) => (
              <Card key={t.name}>
                <CardContent className="p-6">
                  <div className="flex gap-0.5 text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-4 fill-gold" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-navy/80">&ldquo;{t.quote}&rdquo;</p>
                  <p className="mt-4 text-sm font-semibold text-navy">{t.name} · {t.city}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* MOBILE EXPERIENCE */}
      <section className="container-page py-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="navy" className="mb-3">Built for mobile</Badge>
            <h2 className="text-2xl font-extrabold md:text-3xl">Book on the go, even on slower networks</h2>
            <p className="mt-3 text-muted-foreground">
              SMG is designed mobile-first and optimised for Ghanaian network conditions — light pages,
              fast loading and a booking flow that keeps your progress.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-center gap-3"><Smartphone className="size-5 text-gold" /> Responsive on small Android phones and iPhones</li>
              <li className="flex items-center gap-3"><CreditCard className="size-5 text-gold" /> Mobile Money, Visa and Mastercard</li>
              <li className="flex items-center gap-3"><QrCode className="size-5 text-gold" /> QR e-tickets you can show or print</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-cloud p-8">
            <div className="mx-auto max-w-xs rounded-2xl border border-border bg-white p-4 shadow-card">
              <div className="rounded-lg bg-navy p-4 text-white">
                <p className="text-xs text-white/70">Your e-ticket</p>
                <p className="font-heading text-lg font-bold">Cape Coast → Accra</p>
                <p className="text-sm text-white/80">Seat 2A · 10:30</p>
              </div>
              <div className="mt-4 grid place-items-center">
                <QrCode className="size-24 text-navy" />
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">SMG-XXXXXXXX</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ PREVIEW */}
      <section className="bg-cloud py-14">
        <div className="container-page max-w-3xl">
          <h2 className="text-center text-2xl font-extrabold md:text-3xl">Frequently asked questions</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <details key={f.id} className="group rounded-lg border border-border bg-white p-4">
                <summary className="cursor-pointer list-none font-semibold text-navy [&::-webkit-details-marker]:hidden">
                  {f.question}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/faq"><Button variant="outline">See all FAQs</Button></Link>
          </div>
        </div>
      </section>

      {/* SUPPORT CTA */}
      <section className="container-page py-14">
        <Card className="bg-navy text-white">
          <CardContent className="flex flex-col items-center justify-between gap-4 p-8 text-center md:flex-row md:text-left">
            <div>
              <h3 className="font-heading text-xl font-bold text-white">Need help with a booking?</h3>
              <p className="mt-1 text-white/75">Our customer support team is here for you. (Contact details are placeholders.)</p>
            </div>
            <div className="flex gap-3">
              <Link href="/contact"><Button>Contact us</Button></Link>
              <Link href="/manage"><Button variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10">Manage booking</Button></Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
