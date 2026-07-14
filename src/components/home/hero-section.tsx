import Image from 'next/image';
import type { PublicSiteConfig } from '@/lib/types';
import { ServiceBenefits } from './service-benefits';
import { TripSearchCard, type TripSearchDefaults } from './trip-search-card';

/**
 * Marketing hero: a two-column layout on desktop (copy + benefits on the left,
 * coach photograph on the right) with the "Find Your Trip" card floating over
 * the lower-right of the image. Below the `lg` breakpoint everything stacks and
 * the search card sits in normal flow, full-width, inside the hero.
 */
export function HeroSection({
  site,
  cities,
  defaults,
}: {
  site: PublicSiteConfig;
  cities: string[];
  defaults?: TripSearchDefaults;
}) {
  return (
    <section className="relative overflow-hidden bg-pagebg">
      <div className="container-page pt-10 lg:pt-14 lg:pb-56">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
          {/* LEFT — copy + benefits */}
          <div className="max-w-xl animate-rise-in">
            <p className="text-sm font-bold uppercase tracking-wide text-orange-600">
              {site.homeEyebrow}
            </p>
            <h1
              className="mt-3 font-heading font-extrabold leading-[1.05] text-navy [text-wrap:balance]"
              style={{ fontSize: 'clamp(2.25rem, 4.8vw, 3.75rem)' }}
            >
              {site.tagline}
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              {site.homeIntro}
            </p>
            <div className="mt-8 max-w-lg">
              <ServiceBenefits />
            </div>
          </div>

          {/* RIGHT — coach photograph with the search card floating over its
              lower portion on desktop, and stacked beneath it on smaller screens. */}
          <div className="relative">
            <div className="hero-photo-fallback relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-card sm:aspect-[16/10] lg:aspect-[16/11]">
              <Image
                src="/images/fleet/ghana-highway-coach.png"
                alt="A modern blue SMG intercity coach travelling on a Ghanaian highway"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            {/* Nested in the right column so the card aligns exactly to the image
                box (proper gutter) instead of the container padding edge. */}
            <div className="mt-6 lg:absolute lg:inset-x-0 lg:top-[62%] lg:mt-0">
              <TripSearchCard cities={cities} defaults={defaults} className="animate-rise-in" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
