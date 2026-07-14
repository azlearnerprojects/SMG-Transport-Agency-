import { isPublicRoute } from './public-data';
import type { Route, Schedule } from './types';

/**
 * A route shaped for the marketing homepage. This is the single, serialisable
 * contract shared by the server-rendered homepage and the `/api/routes`
 * endpoint used by the client Active Routes section (retry / refresh), so both
 * paths produce identical cards.
 */
export interface HomeRoute {
  id: string;
  code: string;
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
  /** Lowest standard fare across scheduled departures; 0 when none is priced. */
  startingFare: number;
  /** True when at least one upcoming departure is scheduled. */
  available: boolean;
  popular: boolean;
}

function routeLabel(route: Pick<Route, 'origin' | 'destination'>): string {
  return `${route.origin} to ${route.destination}`;
}

/** Normalise "Accra -> Kumasi" / "Accra → Kumasi" / "Accra to Kumasi" alike. */
function normalizeRouteName(value: string): string {
  return value.trim().toLowerCase().replace(/\s*(->|→)\s*/g, ' to ');
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build the ordered list of public routes for the homepage.
 *
 * Ordering: admin-configured featured routes first (in their configured order),
 * then popular routes, then alphabetical. Only publicly-visible routes are ever
 * returned — draft / placeholder routes stay hidden from visitors.
 */
export function buildHomeRoutes(
  routes: Route[],
  schedules: Schedule[],
  featuredRoutes: string[] = [],
  limit = 8,
): HomeRoute[] {
  const today = todayStr();

  // Pre-group schedules by route so we do a single pass rather than filtering
  // the full schedule list once per route.
  const scheduledByRoute = new Map<string, Schedule[]>();
  for (const schedule of schedules) {
    if (schedule.status !== 'scheduled') continue;
    const bucket = scheduledByRoute.get(schedule.routeId);
    if (bucket) bucket.push(schedule);
    else scheduledByRoute.set(schedule.routeId, [schedule]);
  }

  const featuredOrder = new Map(
    featuredRoutes.map((name, index) => [normalizeRouteName(name), index] as const),
  );

  return routes
    .filter(isPublicRoute)
    .map((route): HomeRoute => {
      const routeSchedules = scheduledByRoute.get(route.id) ?? [];
      const fares = routeSchedules
        .map((schedule) => schedule.fares.standard)
        .filter((fare) => fare > 0);
      const available = routeSchedules.some((schedule) => schedule.date >= today);
      return {
        id: route.id,
        code: route.code,
        origin: route.origin,
        destination: route.destination,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        startingFare: fares.length ? Math.min(...fares) : 0,
        available,
        popular: route.popular,
      };
    })
    .sort((a, b) => {
      const aOrder = featuredOrder.get(normalizeRouteName(routeLabel(a))) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = featuredOrder.get(normalizeRouteName(routeLabel(b))) ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      return routeLabel(a).localeCompare(routeLabel(b));
    })
    .slice(0, limit);
}
