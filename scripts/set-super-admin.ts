/**
 * Promote the first SMG super admin.
 *
 * Run:
 *   npm run admin:set-super-admin
 *
 * Requirements:
 *   - Francis must have signed in with Google at least once.
 *   - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must
 *     be available in .env.local, .env, or the process environment.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local or your shell environment.`);
  }
  return value;
}

async function main() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  const projectId = requireEnv('FIREBASE_PROJECT_ID');
  const clientEmail = requireEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  const auth = getAuth();
  const firestore = getFirestore();
  const email = (process.env.SUPER_ADMIN_EMAIL ?? 'francis@pwavwe.com').trim().toLowerCase();

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
    if (code === 'auth/user-not-found') {
      console.error(`No Firebase Auth user exists for ${email}. Ask Francis to sign in with Google once, then rerun this script.`);
      process.exit(1);
    }
    throw err;
  }

  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims ?? {}),
    role: 'super_admin',
    superAdmin: true,
    admin: true,
  });

  const now = new Date().toISOString();
  const ref = firestore.collection('users').doc(user.uid);
  const existing = await ref.get();
  await ref.set(
    {
      uid: user.uid,
      displayName: user.displayName ?? existing.get('displayName') ?? 'Francis',
      email,
      photoURL: user.photoURL ?? existing.get('photoURL') ?? '',
      role: 'super_admin',
      status: 'active',
      createdAt: existing.get('createdAt') ?? now,
      updatedAt: now,
      lastLoginAt: existing.get('lastLoginAt') ?? now,
    },
    { merge: true },
  );

  console.log(`Success: ${email} is now SUPER ADMIN.`);
  console.log(`Auth uid: ${user.uid}`);
  console.log('Custom claims set: role=super_admin, superAdmin=true, admin=true');
  console.log('Firestore profile updated in users/{uid}.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
