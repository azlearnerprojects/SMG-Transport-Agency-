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

export async function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const app = getApps().length ? getApp() : initializeApp(getFirebaseClientConfig());
  await maybeInitAppCheck(app);
  return app;
}

let appCheckStarted = false;

async function maybeInitAppCheck(app: unknown) {
  if (appCheckStarted || typeof window === 'undefined') return;
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) return;
  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
  initializeAppCheck(app as Parameters<typeof initializeAppCheck>[0], {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  appCheckStarted = true;
}

/**
 * Returns the Firebase Auth instance, or null when unconfigured.
 * Demo data can still run while Firebase Auth is used for customer sign-in previews.
 */
export async function getFirebaseAuth() {
  const app = await getFirebaseApp();
  if (!app) return null;
  const { getAuth } = await import('firebase/auth');
  return getAuth(app);
}

/** Returns the client Firestore instance, or null when Firebase is unconfigured. */
export async function getFirebaseDb() {
  const app = await getFirebaseApp();
  if (!app) return null;
  const { getFirestore } = await import('firebase/firestore');
  return getFirestore(app);
}

/** Returns the Firebase Functions instance, or null when Firebase is unconfigured. */
export async function getFirebaseFunctions() {
  const app = await getFirebaseApp();
  if (!app) return null;
  const { getFunctions } = await import('firebase/functions');
  return getFunctions(app, process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? 'us-central1');
}
