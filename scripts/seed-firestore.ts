/**
 * Seed Cloud Firestore with initial operational data for production.
 *
 * Idempotent: each collection is only written when it is empty (existing data
 * is never overwritten) unless --force is passed for reference collections.
 * Schedules are always topped up by CREATING only documents that do not exist
 * yet — booked seats on existing schedules are never touched.
 *
 * Run:
 *   npm run seed:firestore            # seed missing data only
 *   npm run seed:firestore -- --force # overwrite reference data (never bookings)
 *
 * Credentials: FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY,
 * or GOOGLE_APPLICATION_CREDENTIALS, or gcloud Application Default Credentials.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { buildSeed, type SeedData } from '../src/lib/data/seed';
import { DEFAULT_PUBLIC_SITE_CONFIG, DEFAULT_CHATBOT_RUNTIME_CONFIG } from '../src/lib/site-config';
import type { Schedule, StaffProfile } from '../src/lib/types';

const SUPER_ADMINS = [
  { id: 'staff_francis', email: 'francis@pwavwe.com', fullName: 'Francis Pwavwe' },
  { id: 'staff_support', email: 'support@smgagencygh.com', fullName: 'SMG Support' },
] as const;
const FORCE = process.argv.includes('--force');

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

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Remove demo-only markers so seeded records read as production content. */
function productionize(seed: SeedData): SeedData {
  return {
    ...seed,
    routes: seed.routes.map((route) => ({
      ...route,
      description: route.description.replace(/\s*\(Sample route[^)]*\)/i, ''),
    })),
    faqs: seed.faqs.map((faq) => ({
      ...faq,
      answer: faq.answer.replace(/\s*\(Final values[^)]*\)/i, ''),
    })),
    // No demo-blocked seats or pre-booked seats in production.
    buses: seed.buses.map((bus) => ({ ...bus, blockedSeatIds: [] })),
    schedules: seed.schedules.map((schedule) => ({ ...schedule, bookedSeatIds: [] })),
  };
}

async function seedCollection<T extends { id: string }>(
  db: Firestore,
  name: string,
  rows: T[],
): Promise<string> {
  const existing = await db.collection(name).limit(1).get();
  if (!existing.empty && !FORCE) return `${name}: kept existing data (${rows.length} candidates skipped)`;
  let batch = db.batch();
  let ops = 0;
  for (const row of rows) {
    batch.set(db.collection(name).doc(row.id), row);
    ops += 1;
    if (ops % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  return `${name}: wrote ${rows.length} document(s)${FORCE && !existing.empty ? ' (forced)' : ''}`;
}

/** Schedules are additive only: never rewrite an existing schedule document. */
async function topUpSchedules(db: Firestore, schedules: Schedule[]): Promise<string> {
  const existingIds = new Set<string>();
  const snap = await db.collection('schedules').select().get();
  for (const doc of snap.docs) existingIds.add(doc.id);

  const fresh = schedules.filter((s) => !existingIds.has(s.id));
  let batch = db.batch();
  let ops = 0;
  for (const schedule of fresh) {
    batch.set(db.collection('schedules').doc(schedule.id), schedule);
    ops += 1;
    if (ops % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  return `schedules: created ${fresh.length} new (kept ${existingIds.size} existing untouched)`;
}

async function main() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

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

  console.log(`Seeding Firestore for project: ${projectId ?? '(ADC default project)'}`);
  console.log(`Mode: ${FORCE ? 'FORCE (reference data overwritten)' : 'fill missing only'}`);
  console.log('--------------------------------------------------------------');

  // Two build windows => 14 days of upcoming departures (ids are date-based,
  // so merging by id is safe).
  const now = new Date();
  const base = productionize(buildSeed(now));
  const nextWeek = productionize(buildSeed(addDays(now, 7)));
  const scheduleById = new Map<string, Schedule>();
  for (const s of [...base.schedules, ...nextWeek.schedules]) scheduleById.set(s.id, s);

  const staff: StaffProfile[] = SUPER_ADMINS.map((adminUser) => ({
    ...adminUser,
    role: 'super_admin',
    active: true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }));

  const results: string[] = [];
  results.push(await seedCollection(db, 'seatLayouts', base.seatLayouts));
  results.push(await seedCollection(db, 'buses', base.buses));
  results.push(await seedCollection(db, 'boardingPoints', base.boardingPoints));
  results.push(await seedCollection(db, 'routes', base.routes));
  results.push(await seedCollection(db, 'promotions', base.promotions));
  results.push(await seedCollection(db, 'faqs', base.faqs));
  results.push(await seedCollection(db, 'announcements', base.announcements));
  results.push(await seedCollection(db, 'contentPages', base.contentPages));
  results.push(await seedCollection(db, 'staffProfiles', staff));
  results.push(await topUpSchedules(db, [...scheduleById.values()]));

  // Policy settings document (only if missing).
  const settingsRef = db.collection('systemSettings').doc('settings');
  if (!(await settingsRef.get()).exists || FORCE) {
    await settingsRef.set(base.settings);
    results.push('systemSettings/settings: written');
  } else {
    results.push('systemSettings/settings: kept existing');
  }

  // Public site config + private chatbot runtime config (only if missing) so
  // the admin Config panel starts from sensible values.
  const publicRef = db.collection('siteConfig').doc('public');
  if (!(await publicRef.get()).exists) {
    await publicRef.set({ ...DEFAULT_PUBLIC_SITE_CONFIG, updatedAt: now.toISOString() });
    results.push('siteConfig/public: written with defaults');
  } else {
    results.push('siteConfig/public: kept existing');
  }
  const privateRef = db.collection('siteConfig').doc('private');
  if (!(await privateRef.get()).exists) {
    await privateRef.set({
      chatbot: { ...DEFAULT_CHATBOT_RUNTIME_CONFIG, updatedAt: now.toISOString() },
      updatedAt: now.toISOString(),
    });
    results.push('siteConfig/private: written with defaults');
  } else {
    results.push('siteConfig/private: kept existing');
  }

  console.log(results.join('\n'));
  console.log('--------------------------------------------------------------');
  console.log('Firestore seed complete.');
  console.log('NOTE: routes, fares and schedules are the illustrative launch dataset —');
  console.log('review and adjust them from the Firebase console or admin tooling.');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  if (/credential|GOOGLE_APPLICATION_CREDENTIALS|application default|private key|could not load/i.test(message)) {
    console.error('Firebase Admin credentials are not configured or are invalid.');
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service-account/authorized-user JSON, or configure gcloud ADC.');
  }
  console.error(message);
  process.exit(1);
});
