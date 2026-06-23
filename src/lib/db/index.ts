import { DEMO_MODE } from '@/lib/config';
import { getStore, type MockStore } from '@/lib/data/store';

/**
 * Database access boundary.
 *
 * The whole application talks to the data layer through `getDb()`. In DEMO mode
 * this returns the in-memory mock store. For production, a Firestore-backed
 * adapter implementing the same method surface as `MockStore` should be wired in
 * here (see FIREBASE_SETUP.md and ARCHITECTURE.md). We deliberately throw rather
 * than silently serve mock data when DEMO mode is off, so integrations are never
 * faked.
 */
export type Database = MockStore;

export function getDb(): Database {
  if (DEMO_MODE) return getStore();
  throw new Error(
    'Non-demo mode requires a Firestore adapter (not yet implemented). ' +
      'See FIREBASE_SETUP.md. To run locally, set NEXT_PUBLIC_DEMO_MODE=true.',
  );
}
