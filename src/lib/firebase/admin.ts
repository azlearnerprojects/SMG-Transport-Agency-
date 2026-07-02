/**
 * Firebase Admin SDK initialiser (server-side only).
 *
 * Lazily initialised so the heavy SDK is only loaded when real credentials are
 * present. Used by server APIs, role management, and setup scripts to verify ID
 * tokens and write privileged Firestore fields.
 */
export function isAdminConfigured(): boolean {
  const hasInlineServiceAccount = Boolean(
    process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY,
  );
  // Application Default Credentials are expected when there is a real credential
  // signal: an explicit ADC file, a server-side project id, or a GCP serverless
  // runtime (Cloud Run / Cloud Functions expose credentials via the metadata
  // server). NEXT_PUBLIC_* vars are deliberately excluded — they are shipped to
  // the browser and say nothing about whether the server has credentials, so
  // trusting them makes an unconfigured server look configured and turns a clear
  // 503 into a confusing 500.
  const hasApplicationDefault = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      process.env.FIREBASE_CONFIG ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.K_SERVICE || // Cloud Run / Cloud Functions (gen2) runtime
      process.env.FUNCTION_TARGET, // Cloud Functions runtime
  );
  return hasInlineServiceAccount || hasApplicationDefault;
}

export async function getAdminApp() {
  if (!isAdminConfigured()) return null;
  const { initializeApp, getApps, cert, applicationDefault } = await import('firebase-admin/app');
  const defaultApp = getApps().find((app) => app.name === '[DEFAULT]');
  if (defaultApp) return defaultApp;
  if (!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)) {
    return initializeApp({
      credential: applicationDefault(),
      projectId:
        process.env.FIREBASE_PROJECT_ID ??
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
        process.env.GCLOUD_PROJECT ??
        process.env.GCP_PROJECT,
    });
  }
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The private key is stored with literal "\n" — restore real newlines.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function getAdminAuth() {
  const app = await getAdminApp();
  if (!app) return null;
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth(app);
}

export async function getAdminFirestore() {
  const app = await getAdminApp();
  if (!app) return null;
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore(app);
}
