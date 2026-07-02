/**
 * Promote the first SMG super admin.
 *
 * Run:
 *   npm run admin:set-super-admin
 *
 * Requirements:
 *   - Francis must have signed in with Google at least once.
 *   - Use FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY, or
 *     Google Application Default Credentials via gcloud, or a service-account
 *     JSON pointed to by GOOGLE_APPLICATION_CREDENTIALS.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const SUPER_ADMIN_EMAIL = 'francis@pwavwe.com';

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
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    }
  }

  const auth = getAuth();
  const firestore = getFirestore();
  const email = SUPER_ADMIN_EMAIL;

  console.log(`Promoting ${email} to SMG Super Admin.`);
  console.log(`Firebase project: ${projectId ?? 'Application Default Credentials default project'}`);

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
  const message = err instanceof Error ? err.message : String(err);
  if (/credential|GOOGLE_APPLICATION_CREDENTIALS|application default|private key|could not load/i.test(message)) {
    console.error('Firebase Admin credentials are not configured or are invalid.');
    console.error('If gcloud is not installed, use a service-account JSON outside this repo and set GOOGLE_APPLICATION_CREDENTIALS to its full path. Otherwise install Google Cloud CLI and run gcloud auth application-default login.');
    console.error('Then rerun npm run admin:set-super-admin.');
  }
  console.error(message);
  process.exit(1);
});
