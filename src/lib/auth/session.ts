import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { canUseStaffDashboard } from '@/lib/auth/roles';
import type { StaffRole } from '@/lib/types';

/**
 * Server-side staff session for the admin dashboard.
 *
 * Runtime implementation: a signed (HMAC) cookie carrying the staff identity
 * and role. Production login mints this cookie only after Firebase ID token and
 * role verification with the Admin SDK; demo login mints it after password
 * verification. Admin protection NEVER relies on hidden links - every admin
 * route and API checks this session server-side.
 */
// This cookie MUST be named `__session`. In production the app is served by
// Firebase Hosting in front of a Cloud Run SSR backend, and Firebase Hosting
// strips every incoming cookie EXCEPT one literally named `__session` before
// forwarding the request to the backend. Any other name (e.g. the old
// `smg_admin`) is stored in the browser fine, but the CDN drops it on the next
// request, so the admin guard sees no session and redirects back to
// /admin/login. See https://firebase.google.com/docs/hosting/manage-cache#using_cookies
const COOKIE = '__session';
const SECRET = process.env.ADMIN_SESSION_SECRET ?? process.env.QR_VERIFY_SECRET ?? 'smg-demo-admin-secret';
const MAX_AGE_SECONDS = 60 * 60 * 8;

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

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
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
  store.set(COOKIE, encodeSession(session), sessionCookieOptions());
}

export function attachStaffSessionCookie<T extends NextResponse>(response: T, session: StaffSession): T {
  response.cookies.set(COOKIE, encodeSession(session), sessionCookieOptions());
  return response;
}

export function attachClearStaffSessionCookie<T extends NextResponse>(response: T): T {
  response.cookies.set(COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}

export async function clearStaffSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
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
