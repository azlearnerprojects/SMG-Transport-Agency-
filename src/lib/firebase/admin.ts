/**
 * Firebase Admin SDK initialiser (server-side only).
 *
 * Lazily initialised so the heavy SDK is only loaded when real credentials are
 * present and DEMO mode is off. Used by server APIs to verify ID tokens and (in
 * a future iteration) to read/write Firestore via the production db adapter.
 */
import { DEMO_MODE } from '@/lib/config';

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

export async function getAdminApp() {
  if (DEMO_MODE || !isAdminConfigured()) return null;
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
