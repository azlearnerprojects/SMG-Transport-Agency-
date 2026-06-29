import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { canUseStaffDashboard } from '@/lib/auth/roles';
import type { StaffRole } from '@/lib/types';

/**
 * Server-side staff session for the admin dashboard.
 *
 * DEMO implementation: a signed (HMAC) cookie carrying the staff email + role.
 * In production this should be replaced by Firebase Auth ID tokens + custom
 * claims verified with the Admin SDK (see ARCHITECTURE.md / FIREBASE_SETUP.md).
 * Admin protection NEVER relies on hidden links — every admin route and API
 * checks this session server-side.
 */
const COOKIE = 'smg_admin';
const SECRET = process.env.ADMIN_SESSION_SECRET ?? process.env.QR_VERIFY_SECRET ?? 'smg-demo-admin-secret';

export interface StaffSession {
  uid?: string;
  email: string;
  role: StaffRole;
  name: string;
  photoURL?: string;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 24);
}

export function encodeSession(session: StaffSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): StaffSession | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()) as StaffSession;
  } catch {
    return null;
  }
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE)?.value);
}

export async function setStaffSession(session: StaffSession): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function clearStaffSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Coarse role gate. Returns true if the session role is in the allow-list. */
export function roleAllowed(session: StaffSession | null, allowed: StaffRole[]): boolean {
  if (!session) return false;
  if (session.role === 'super_admin') return true;
  if (session.role === 'admin') return true;
  return allowed.includes(session.role);
}

export function canAccessAdmin(session: StaffSession | null): boolean {
  return canUseStaffDashboard(session?.role);
}
