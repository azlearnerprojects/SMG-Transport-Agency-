/**
 * Upsert SMG's official launch routes, fares, pickup points and upcoming
 * schedules into Cloud Firestore.
 *
 * Run:
 *   npx tsx scripts/setup-smg-routes.ts
 *
 * Credentials: FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY,
 * or GOOGLE_APPLICATION_CREDENTIALS, or gcloud Application Default Credentials.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { buildSeed } from '../src/lib/data/seed';
import type { BoardingPoint, Bus, Promotion, Route, Schedule } from '../src/lib/types';

const DEPARTURE_TIME = '10:00';
const CHECK_IN_TIME = '09:00';
const DEPARTURE_DATE = '2026-07-25';
const PROMO_ID = 'promo_freeperks';
const PROMO_CODE = 'FREEPERKS';
const SERVICE_FEE = 0;

const PICKUP_POINTS = [
  { id: 'bp_oldsite_terminal', city: 'UCC', name: 'Oldsite Terminal', address: 'Oldsite terminal' },
  { id: 'bp_science_terminal', city: 'UCC', name: 'Science Terminal', address: 'Science terminal' },
  { id: 'bp_valco_junction', city: 'UCC', name: 'Valco Junction', address: 'Valco Junction' },
] as const;

const DESTINATION_POINTS = [
  { id: 'bp_accra_kaneshie', city: 'Accra', name: 'Kaneshie Terminal', address: 'Kaneshie, Accra' },
  { id: 'bp_kumasi_terminal', city: 'Kumasi', name: 'Kumasi Terminal', address: 'Kumasi terminal' },
  { id: 'bp_tema_terminal', city: 'Tema', name: 'Tema Terminal', address: 'Tema terminal' },
] as const;

const ROUTES = [
  {
    id: 'route_cape_coast_accra_kaneshie',
    code: 'UCC-KA',
    origin: 'UCC',
    destination: 'Kaneshie',
    destinationBoardingPointId: 'bp_accra_kaneshie',
    distanceKm: 144,
    durationMinutes: 180,
    fare: 140,
  },
  {
    id: 'route_cape_coast_kumasi',
    code: 'UCC-KU',
    origin: 'UCC',
    destination: 'Kumasi',
    destinationBoardingPointId: 'bp_kumasi_terminal',
    distanceKm: 240,
    durationMinutes: 270,
    fare: 155,
  },
  {
    id: 'route_cape_coast_tema',
    code: 'UCC-TE',
    origin: 'UCC',
    destination: 'Tema',
    destinationBoardingPointId: 'bp_tema_terminal',
    distanceKm: 170,
    durationMinutes: 210,
    fare: 145,
  },
] as const;

function loadEnvFile(fileName: string) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function loadFirebaseCliAdcIfPresent() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
  const appData = process.env.APPDATA;
  if (!appData) return;
  const firebaseDir = resolve(appData, 'firebase');
  if (!existsSync(firebaseDir)) return;
  const adcFile = readdirSync(firebaseDir).find((name) => name.endsWith('_application_default_credentials.json'));
  if (adcFile) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(firebaseDir, adcFile);
  }
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function routeDescription(destination: string, fare: number): string {
  return [
    `UCC to ${destination} service.`,
    `Fare: GHS ${fare.toFixed(2)}.`,
    `Pickup points: Oldsite Terminal, Science Terminal and Valco Junction.`,
    `Passengers should arrive by ${CHECK_IN_TIME}; departure is ${DEPARTURE_TIME}.`,
    'Promotion includes a free snack, free 1GB data on all networks, and two free small luggages.',
  ].join(' ');
}

async function seedBaseBusIfNeeded(db: Firestore, now: string): Promise<string> {
  const activeBusSnap = await db.collection('buses').where('status', '==', 'active').limit(1).get();
  if (!activeBusSnap.empty) return activeBusSnap.docs[0]!.id;

  const seed = buildSeed(new Date(now));
  const layout = seed.seatLayouts[0]!;
  const bus: Bus = {
    ...seed.buses[0]!,
    id: 'bus_smg_standard1',
    busNumber: 'SMG-001',
    name: 'SMG Standard Coach',
    blockedSeatIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('seatLayouts').doc(layout.id).set(layout, { merge: true });
  await db.collection('buses').doc(bus.id).set(bus, { merge: true });
  return bus.id;
}

async function writeBatch<T extends { id: string }>(db: Firestore, collection: string, rows: T[]) {
  const batch = db.batch();
  for (const row of rows) {
    batch.set(db.collection(collection).doc(row.id), row, { merge: true });
  }
  await batch.commit();
}

async function upsertSchedules(db: Firestore, busId: string, nowIso: string): Promise<number> {
  const batch = db.batch();
  let written = 0;

  for (const route of ROUTES) {
    const id = `sch_${route.code.toLowerCase().replace('-', '')}_${DEPARTURE_DATE}_${DEPARTURE_TIME.replace(':', '')}`;
    const ref = db.collection('schedules').doc(id);
    const snap = await ref.get();
    const existing = snap.data() as Partial<Schedule> | undefined;
    const schedule: Schedule = {
      id,
      routeId: route.id,
      busId,
      date: DEPARTURE_DATE,
      departureTime: DEPARTURE_TIME,
      arrivalTime: addMinutesToTime(DEPARTURE_TIME, route.durationMinutes),
      status: 'scheduled',
      fares: {
        standard: route.fare,
        business: route.fare,
        vip: route.fare,
      },
      serviceFee: SERVICE_FEE,
      promotionId: PROMO_ID,
      bookedSeatIds: Array.isArray(existing?.bookedSeatIds) ? existing.bookedSeatIds : [],
      createdAt: typeof existing?.createdAt === 'string' ? existing.createdAt : nowIso,
      updatedAt: nowIso,
    };
    batch.set(ref, schedule, { merge: true });
    written += 1;
  }

  await batch.commit();
  return written;
}

async function pauseOtherLaunchSchedules(db: Firestore, nowIso: string): Promise<number> {
  const launchRouteIds = new Set<string>(ROUTES.map((route) => route.id));
  const snap = await db.collection('schedules').where('status', '==', 'scheduled').get();
  let batch = db.batch();
  let ops = 0;
  let paused = 0;

  for (const doc of snap.docs) {
    const schedule = doc.data() as Partial<Schedule>;
    if (!schedule.routeId || !launchRouteIds.has(schedule.routeId)) continue;
    if (schedule.date === DEPARTURE_DATE) continue;

    batch.set(doc.ref, { status: 'paused', updatedAt: nowIso }, { merge: true });
    ops += 1;
    paused += 1;

    if (ops % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  return paused;
}

async function archiveNonLaunchRoutes(db: Firestore, nowIso: string): Promise<number> {
  const launchRouteIds = new Set<string>(ROUTES.map((route) => route.id));
  const snap = await db.collection('routes').where('status', '==', 'active').get();
  let batch = db.batch();
  let ops = 0;
  let archived = 0;

  for (const doc of snap.docs) {
    if (launchRouteIds.has(doc.id)) continue;

    batch.set(doc.ref, { status: 'archived', updatedAt: nowIso }, { merge: true });
    ops += 1;
    archived += 1;

    if (ops % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  return archived;
}

async function main() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');
  loadFirebaseCliAdcIfPresent();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    process.env.GCP_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!getApps().length) {
    if (projectId && clientEmail && privateKey) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }

  const db = getFirestore();
  const now = new Date().toISOString();
  const busId = await seedBaseBusIfNeeded(db, now);

  const boardingPoints: BoardingPoint[] = [...PICKUP_POINTS, ...DESTINATION_POINTS].map((point) => ({
    ...point,
    createdAt: now,
    updatedAt: now,
  }));

  const routes: Route[] = ROUTES.map((route) => ({
    id: route.id,
    code: route.code,
    origin: route.origin,
    destination: route.destination,
    originBoardingPointId: 'bp_oldsite_terminal',
    destinationBoardingPointId: route.destinationBoardingPointId,
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    description: routeDescription(route.destination, route.fare),
    popular: true,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }));

  const promotion: Promotion = {
    id: PROMO_ID,
    code: PROMO_CODE,
    title: 'Free travel perks',
    description: 'Enjoy a free snack, free 1GB data on all networks, and two free small luggages on SMG launch routes.',
    type: 'flat',
    value: 0,
    active: true,
    startsAt: now,
    endsAt: addDays(new Date(now), 90).toISOString(),
    routeIds: routes.map((route) => route.id),
    createdAt: now,
    updatedAt: now,
  };

  await writeBatch(db, 'boardingPoints', boardingPoints);
  await writeBatch(db, 'routes', routes);
  await db.collection('promotions').doc(promotion.id).set(promotion, { merge: true });
  const routesArchived = await archiveNonLaunchRoutes(db, now);
  const schedulesPaused = await pauseOtherLaunchSchedules(db, now);
  const schedulesWritten = await upsertSchedules(db, busId, now);

  await db.collection('siteConfig').doc('public').set(
    {
      featuredRoutes: routes.map((route) => `${route.origin} to ${route.destination}`),
      homeRoutesTitle: 'Active SMG routes',
      homeRoutesIntro: 'Book UCC departures to Kaneshie, Tema and Kumasi for 25 July 2026.',
      serviceFee: SERVICE_FEE,
      updatedAt: now,
    },
    { merge: true },
  );

  console.log(`Project: ${projectId ?? '(ADC default project)'}`);
  console.log(`Bus used: ${busId}`);
  console.log(`Boarding points upserted: ${boardingPoints.length}`);
  console.log(`Routes upserted: ${routes.length}`);
  console.log(`Other active routes archived: ${routesArchived}`);
  console.log(`Promotion upserted: ${PROMO_CODE}`);
  console.log(`Other launch schedules paused: ${schedulesPaused}`);
  console.log(`Schedules upserted: ${schedulesWritten}`);
  for (const route of routes) {
    const source = ROUTES.find((item) => item.id === route.id)!;
    console.log(`- ${route.origin} to ${route.destination}: GHS ${source.fare.toFixed(2)}`);
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  if (/credential|GOOGLE_APPLICATION_CREDENTIALS|application default|private key|could not load/i.test(message)) {
    console.error('Firebase Admin credentials are not configured or are invalid.');
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS, configure gcloud ADC, or set FIREBASE_* service account env vars.');
  }
  console.error(message);
  process.exit(1);
});
