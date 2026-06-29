import type { AccountStatus, AuthRole, UserProfile } from '@/lib/types';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { isAccountStatus, isAuthRole } from '@/lib/auth/roles';

type RawDoc = Record<string, unknown>;

export interface UserProfileListResult {
  configured: boolean;
  users: UserProfile[];
}

function toIso(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value === 'string' && value) return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && 'toDate' in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    if (maybeDate instanceof Date) return maybeDate.toISOString();
  }
  return fallback;
}

export function normaliseUserProfile(uid: string, data: RawDoc): UserProfile {
  const now = new Date().toISOString();
  const email = typeof data.email === 'string' ? data.email : '';
  const displayName =
    typeof data.displayName === 'string' && data.displayName
      ? data.displayName
      : email.split('@')[0] || 'SMG User';
  const role = isAuthRole(typeof data.role === 'string' ? data.role : undefined)
    ? (data.role as AuthRole)
    : 'customer';
  const status = isAccountStatus(typeof data.status === 'string' ? data.status : undefined)
    ? (data.status as AccountStatus)
    : 'active';

  return {
    uid,
    displayName,
    email,
    photoURL: typeof data.photoURL === 'string' && data.photoURL ? data.photoURL : undefined,
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    role,
    status,
    createdAt: toIso(data.createdAt, now),
    updatedAt: toIso(data.updatedAt, now),
    lastLoginAt: toIso(data.lastLoginAt, now),
  };
}

export async function listFirestoreUsers(): Promise<UserProfileListResult> {
  const db = await getAdminFirestore();
  if (!db) return { configured: false, users: [] };

  const snapshot = await db.collection('users').get();
  const users = snapshot.docs
    .map((doc) => normaliseUserProfile(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { configured: true, users };
}

export async function getFirestoreUser(uid: string): Promise<UserProfile | null> {
  const db = await getAdminFirestore();
  if (!db) return null;
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return normaliseUserProfile(doc.id, doc.data() ?? {});
}

export async function updateAuthClaims(uid: string, role: AuthRole, status: AccountStatus) {
  const auth = await getAdminAuth();
  if (!auth) throw new Error('Firebase Admin Auth is not configured.');
  await auth.setCustomUserClaims(uid, {
    role,
    superAdmin: role === 'super_admin',
    admin: role === 'admin' || role === 'super_admin',
  });
  await auth.updateUser(uid, { disabled: status === 'disabled' });
}
