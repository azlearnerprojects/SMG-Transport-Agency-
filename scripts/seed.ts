/**
 * Demo data seed/inspection script.
 *
 * In DEMO mode the in-memory store seeds itself from `buildSeed()` at runtime, so
 * no database write is required to run the app. This script:
 *   1. Builds the demo dataset and validates its integrity.
 *   2. Writes a human-readable dump to data/seed.generated.json for inspection.
 *   3. Prints a summary and the demo admin login (from env, never hardcoded).
 *
 * Run: npm run seed
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeed } from '../src/lib/data/seed';

function main() {
  const seed = buildSeed(new Date());

  // Integrity checks.
  const errors: string[] = [];
  for (const s of seed.schedules) {
    if (!seed.routes.find((r) => r.id === s.routeId)) errors.push(`Schedule ${s.id} references missing route ${s.routeId}`);
    if (!seed.buses.find((b) => b.id === s.busId)) errors.push(`Schedule ${s.id} references missing bus ${s.busId}`);
  }
  for (const b of seed.buses) {
    if (!seed.seatLayouts.find((l) => l.id === b.seatLayoutId)) errors.push(`Bus ${b.id} references missing layout ${b.seatLayoutId}`);
  }
  if (errors.length) {
    console.error('Seed integrity errors:\n' + errors.join('\n'));
    process.exit(1);
  }

  const outDir = resolve(process.cwd(), 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'seed.generated.json'), JSON.stringify(seed, null, 2), 'utf8');

  console.log('SMG demo seed built successfully (SAMPLE DATA — not official SMG routes/prices).');
  console.log('--------------------------------------------------------------');
  console.log(`  Seat layouts : ${seed.seatLayouts.length}`);
  console.log(`  Buses        : ${seed.buses.length}`);
  console.log(`  Routes       : ${seed.routes.length}`);
  console.log(`  Schedules    : ${seed.schedules.length}`);
  console.log(`  Promotions   : ${seed.promotions.length}`);
  console.log(`  FAQs         : ${seed.faqs.length}`);
  console.log(`  Customers    : ${seed.users.length}`);
  console.log(`  Staff        : ${seed.staff.length}`);
  console.log('--------------------------------------------------------------');
  console.log(`  Demo admin   : ${process.env.DEMO_ADMIN_EMAIL ?? 'admin@smgtransport.test'}`);
  console.log(`  Demo admin pw: ${process.env.DEMO_ADMIN_PASSWORD ?? '(set DEMO_ADMIN_PASSWORD in .env.local)'}`);
  console.log('  Demo customer: ama@example.com (any password)');
  console.log('--------------------------------------------------------------');
  console.log('Dump written to data/seed.generated.json');
}

main();
