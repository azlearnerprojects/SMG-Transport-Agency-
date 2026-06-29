/**
 * Firebase Admin SDK initialiser (server-side only).
 *
 * Lazily initialised so the heavy SDK is only loaded when real credentials are
 * present. Used by server APIs, role management, and setup scripts to verify ID
 * tokens and write privileged Firestore fields.
 */
export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

export async function getAdminApp() {
  if (!isAdminConfigured()) return null;
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  if (getApps().length) {
    const { getApp } = await import('firebase-admin/app');
    return getApp();
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
