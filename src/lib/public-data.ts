import type { Route } from './types';

const PLACEHOLDER_ROUTE_PATTERN = /\b(sample|placeholder|pending approval|demo)\b/i;

export function isPlaceholderRoute(route: Pick<Route, 'description'>): boolean {
  return PLACEHOLDER_ROUTE_PATTERN.test(route.description);
}

export function isPublicRoute(route: Pick<Route, 'status' | 'description'>): boolean {
  return route.status === 'active' && !isPlaceholderRoute(route);
}
