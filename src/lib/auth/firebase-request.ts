import { getAdminAuth } from '@/lib/firebase/admin';

export interface RequestFirebaseUser {
  uid: string;
  email?: string;
}

export function getBearerToken(req: Request): string | undefined {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim() || undefined;
}

export async function verifyFirebaseBearer(req: Request): Promise<RequestFirebaseUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const auth = await getAdminAuth();
  if (!auth) {
    throw new Error('Firebase Admin Auth is not configured.');
  }

  const decoded = await auth.verifyIdToken(token);
  return {
    uid: decoded.uid,
    email: decoded.email?.trim().toLowerCase(),
  };
}
