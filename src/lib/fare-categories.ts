import type { FareCategoryConfig, SeatCategory } from './types';

const DEFAULT_TS = '1970-01-01T00:00:00.000Z';

export const DEFAULT_FARE_CATEGORIES: FareCategoryConfig[] = [
  {
    id: 'standard',
    key: 'standard',
    label: 'Standard',
    description: 'Everyday comfortable travel with core onboard amenities.',
    active: true,
    order: 10,
    createdAt: DEFAULT_TS,
    updatedAt: DEFAULT_TS,
  },
  {
    id: 'business',
    key: 'business',
    label: 'Business',
    description: 'More legroom and priority seating for longer trips.',
    active: true,
    order: 20,
    createdAt: DEFAULT_TS,
    updatedAt: DEFAULT_TS,
  },
  {
    id: 'vip',
    key: 'vip',
    label: 'VIP Executive',
    description: 'Premium seats and priority boarding for executive travel.',
    active: true,
    order: 30,
    createdAt: DEFAULT_TS,
    updatedAt: DEFAULT_TS,
  },
];

const CATEGORY_KEYS = new Set<SeatCategory>(['standard', 'business', 'vip']);

export function mergeFareCategoryDefaults(items: FareCategoryConfig[]) {
  const byKey = new Map<SeatCategory, FareCategoryConfig>();
  for (const item of DEFAULT_FARE_CATEGORIES) byKey.set(item.key, item);
  for (const item of items) {
    if (!CATEGORY_KEYS.has(item.key)) continue;
    byKey.set(item.key, { ...byKey.get(item.key), ...item, id: item.key });
  }
  return [...byKey.values()].sort((a, b) => a.order - b.order);
}
