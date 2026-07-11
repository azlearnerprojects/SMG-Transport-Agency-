import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as loginPOST } from '@/app/api/admin/login/route';
import { POST as logoutPOST } from '@/app/api/admin/logout/route';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { canAccessAdmin, decodeSession } from '@/lib/auth/session';

vi.mock('@/lib/firebase/admin', () => ({
  getAdminAuth: vi.fn(),
  getAdminFirestore: vi.fn(),
}));

vi.mock('@/lib/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/config')>();
  return {
    ...actual,
    DEMO_MODE: true,
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('POST /api/admin/login', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function getSessionFromSetCookie(setCookie: string | null) {
    const token = setCookie?.match(/__session=([^;]+)/)?.[1];
    expect(token).toBeTruthy();
    return decodeSession(decodeURIComponent(token!));
  }

  it('sets the staff session cookie on demo password login', async () => {
    const res = await loginPOST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': 'admin-login-route-demo-test',
        },
        body: JSON.stringify({ email: 'projects@azlearner.me', password: 'Demo!Admin2026' }),
      }),
    );
    const body = await res.json();
    const setCookie = res.headers.get('set-cookie');

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: {
        email: 'projects@azlearner.me',
        role: 'super_admin',
        name: 'SMG Super Administrator',
      },
    });
    expect(setCookie).toContain('__session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=lax');
    expect(setCookie).toContain('Path=/');

    const session = getSessionFromSetCookie(setCookie);
    expect(session).toMatchObject({
      email: 'projects@azlearner.me',
      role: 'super_admin',
      name: 'SMG Super Administrator',
    });
    expect(canAccessAdmin(session)).toBe(true);
  });

  it('returns a controlled 503 when Firebase Admin credentials fail during initialization', async () => {
    vi.mocked(getAdminAuth).mockRejectedValue(
      Object.assign(new Error('Could not load the default credentials'), {
        code: 'app/invalid-credential',
      }),
    );

    const res = await loginPOST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': 'admin-login-route-test',
        },
        body: JSON.stringify({ idToken: 'test-id-token' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      error: 'Staff sign-in is temporarily unavailable (server credentials). Please contact a Super Admin.',
    });
  });

  it('falls back to standard ID token verification when revoked-token checking lacks permission', async () => {
    const verifyIdToken = vi
      .fn()
      .mockRejectedValueOnce(new Error('Credential implementation has insufficient permission.'))
      .mockResolvedValueOnce({
        uid: 'uid-1',
        email: 'admin@example.com',
        name: 'Admin User',
        picture: '',
      });
    const userSnapshot = {
      exists: true,
      data: () => ({
        displayName: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
      }),
      get: vi.fn(),
    };
    const userRef = {
      get: vi.fn().mockResolvedValue(userSnapshot),
      set: vi.fn(),
    };
    const auditLogs = { add: vi.fn() };
    const firestore = {
      collection: vi.fn((name: string) => (name === 'users' ? { doc: vi.fn(() => userRef) } : auditLogs)),
    };

    vi.mocked(getAdminAuth).mockResolvedValue({ verifyIdToken } as never);
    vi.mocked(getAdminFirestore).mockResolvedValue(firestore as never);

    const res = await loginPOST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': 'admin-login-route-fallback-test',
        },
        body: JSON.stringify({ idToken: 'valid-looking-token' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: { email: 'admin@example.com', role: 'admin', name: 'Admin User' },
    });
    expect(res.headers.get('set-cookie')).toContain('__session=');
    expect(res.headers.get('set-cookie')).toContain('HttpOnly');
    expect(res.headers.get('set-cookie')).toContain('SameSite=lax');
    expect(verifyIdToken).toHaveBeenNthCalledWith(1, 'valid-looking-token', true);
    expect(verifyIdToken).toHaveBeenNthCalledWith(2, 'valid-looking-token');
    expect(canAccessAdmin(getSessionFromSetCookie(res.headers.get('set-cookie')))).toBe(true);
  });

  it('allows staff roles that the admin dashboard guard allows', async () => {
    const verifyIdToken = vi.fn().mockResolvedValue({
      uid: 'uid-support',
      email: 'support@example.com',
      name: 'Support User',
      picture: '',
    });
    const userSnapshot = {
      exists: true,
      data: () => ({
        displayName: 'Support User',
        email: 'support@example.com',
        role: 'support_agent',
        status: 'active',
      }),
      get: vi.fn(),
    };
    const userRef = {
      get: vi.fn().mockResolvedValue(userSnapshot),
      set: vi.fn(),
    };
    const auditLogs = { add: vi.fn() };
    const firestore = {
      collection: vi.fn((name: string) => (name === 'users' ? { doc: vi.fn(() => userRef) } : auditLogs)),
    };

    vi.mocked(getAdminAuth).mockResolvedValue({ verifyIdToken } as never);
    vi.mocked(getAdminFirestore).mockResolvedValue(firestore as never);

    const res = await loginPOST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': 'admin-login-route-support-test',
        },
        body: JSON.stringify({ idToken: 'support-agent-token' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: { email: 'support@example.com', role: 'support_agent', name: 'Support User' },
    });
    expect(res.headers.get('set-cookie')).toContain('__session=');
    expect(canAccessAdmin(getSessionFromSetCookie(res.headers.get('set-cookie')))).toBe(true);
  });

  it('allows bootstrap owner emails even when their stored profile is still a customer', async () => {
    const verifyIdToken = vi.fn().mockResolvedValue({
      uid: 'uid-bootstrap',
      email: 'pwavwef@gmail.com',
      name: 'Francis Pwavwe',
      picture: '',
    });
    const firstSnapshot = {
      exists: true,
      data: () => ({
        displayName: 'Francis Pwavwe',
        email: 'pwavwef@gmail.com',
        role: 'customer',
        status: 'active',
      }),
      get: vi.fn((key: string) => (key === 'displayName' ? 'Francis Pwavwe' : '')),
    };
    const freshSnapshot = {
      exists: true,
      data: () => ({
        displayName: 'Francis Pwavwe',
        email: 'pwavwef@gmail.com',
        role: 'super_admin',
        status: 'active',
      }),
      get: vi.fn(),
    };
    const userRef = {
      get: vi.fn().mockResolvedValueOnce(firstSnapshot).mockResolvedValueOnce(freshSnapshot),
      set: vi.fn(),
    };
    const auditLogs = { add: vi.fn() };
    const firestore = {
      collection: vi.fn((name: string) => (name === 'users' ? { doc: vi.fn(() => userRef) } : auditLogs)),
    };

    vi.mocked(getAdminAuth).mockResolvedValue({ verifyIdToken } as never);
    vi.mocked(getAdminFirestore).mockResolvedValue(firestore as never);

    const res = await loginPOST(
      new Request('http://localhost/api/admin/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': 'admin-login-route-bootstrap-test',
        },
        body: JSON.stringify({ idToken: 'bootstrap-token' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: { email: 'pwavwef@gmail.com', role: 'super_admin', name: 'Francis Pwavwe' },
    });
    expect(userRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'super_admin', status: 'active' }),
      { merge: true },
    );
    expect(res.headers.get('set-cookie')).toContain('__session=');
  });

  it('clears the Firebase Hosting session cookie on logout', async () => {
    const res = await logoutPOST();
    const body = await res.json();
    const setCookie = res.headers.get('set-cookie');

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, data: { loggedOut: true } });
    expect(setCookie).toContain('__session=');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=lax');
    expect(setCookie).toContain('Path=/');
  });
});
