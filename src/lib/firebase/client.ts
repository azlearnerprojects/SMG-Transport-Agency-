/**
 * Firebase Web SDK initialiser (client-side).
 *
 * In DEMO mode this is never used. When real credentials are supplied via
 * NEXT_PUBLIC_FIREBASE_* env vars and NEXT_PUBLIC_DEMO_MODE=false, this returns a
 * lazily-initialised Firebase app. Imports are dynamic so the SDK is not bundled
 * unless actually used.
 */
import { DEMO_MODE } from '@/lib/config';

export function getFirebaseClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const c = getFirebaseClientConfig();
  return Boolean(c.apiKey && c.projectId && c.appId);
}

/**
 * Returns the Firebase Auth instance, or null in DEMO mode / when unconfigured.
 * The app's auth provider falls back to the demo auth implementation in that case.
 */
export async function getFirebaseAuth() {
  if (DEMO_MODE || !isFirebaseConfigured()) return null;
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');
  const app = getApps().length ? getApp() : initializeApp(getFirebaseClientConfig());
  return getAuth(app);
}
