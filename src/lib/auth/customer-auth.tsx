'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Customer auth context (DEMO implementation).
 *
 * Backed by localStorage so the dashboard, guest-vs-account flows and profile
 * editing are all demonstrable without Firebase. In production this provider is
 * the seam where Firebase Authentication (email/password, email verification,
 * password reset, optional phone auth) is wired in — the component API stays the
 * same. Demo accounts accept any password.
 */
export interface CustomerUser {
  email: string;
  fullName: string;
  phone: string;
}

interface AuthState {
  user: CustomerUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (u: CustomerUser & { password: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (patch: Partial<CustomerUser>) => void;
}

const SEEDED: Record<string, CustomerUser> = {
  'ama@example.com': { email: 'ama@example.com', fullName: 'Ama Mensah', phone: '+233241234567' },
  'kofi@example.com': { email: 'kofi@example.com', fullName: 'Kofi Boateng', phone: '+233201112233' },
};

const STORAGE_KEY = 'smg_customer';
const REGISTRY_KEY = 'smg_customer_registry';

const AuthContext = createContext<AuthState | null>(null);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore corrupt storage */
    }
    setLoading(false);
  }, []);

  const persist = useCallback((u: CustomerUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback<AuthState['login']>(async (email, _password) => {
    const key = email.trim().toLowerCase();
    const seeded = SEEDED[key];
    if (seeded) {
      persist(seeded);
      return { ok: true };
    }
    try {
      const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? '{}') as Record<string, CustomerUser>;
      if (registry[key]) {
        persist(registry[key]);
        return { ok: true };
      }
    } catch {
      /* ignore */
    }
    return { ok: false, error: 'No account found. Try a demo account or register first.' };
  }, [persist]);

  const register = useCallback<AuthState['register']>(async (u) => {
    const key = u.email.trim().toLowerCase();
    try {
      const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? '{}') as Record<string, CustomerUser>;
      const profile: CustomerUser = { email: key, fullName: u.fullName, phone: u.phone };
      registry[key] = profile;
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
      persist(profile);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not create the account locally.' };
    }
  }, [persist]);

  const logout = useCallback(() => persist(null), [persist]);

  const updateProfile = useCallback<AuthState['updateProfile']>(
    (patch) => {
      if (!user) return;
      persist({ ...user, ...patch });
    },
    [user, persist],
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile }),
    [user, loading, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCustomerAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}
