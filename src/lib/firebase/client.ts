/**
 * Firebase Web SDK initialiser (client-side).
 *
 * When real credentials are supplied via NEXT_PUBLIC_FIREBASE_* env vars, this
 * returns a lazily-initialised Firebase app/auth instance. Imports are dynamic so
 * the SDK is not bundled unless a Firebase-backed feature is used.
 */
export function getFirebaseClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const c = getFirebaseClientConfig();
  return Boolean(c.apiKey && c.projectId && c.appId);
}

/**
 * Returns the Firebase Auth instance, or null when unconfigured.
 * Demo data can still run while Firebase Auth is used for customer sign-in previews.
 */
export async function getFirebaseAuth() {
  if (!isFirebaseConfigured()) return null;
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');
  const app = getApps().length ? getApp() : initializeApp(getFirebaseClientConfig());
  return getAuth(app);
}
