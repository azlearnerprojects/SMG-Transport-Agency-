'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase/client';
import type { AccountStatus, AuthRole } from '@/lib/types';

export interface CustomerUser {
  uid?: string;
  email: string;
  fullName: string;
  displayName: string;
  phone: string;
  photoURL?: string;
  role: AuthRole;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  provider: 'demo' | 'firebase';
}

interface AuthState {
  user: CustomerUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  register: (u: Omit<CustomerUser, 'displayName' | 'role' | 'status' | 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'provider'> & { password: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<CustomerUser, 'fullName' | 'displayName' | 'phone' | 'photoURL'>>) => Promise<{ ok: boolean; error?: string }>;
}

const SEEDED: Record<string, Pick<CustomerUser, 'email' | 'fullName' | 'displayName' | 'phone'>> = {
  'ama@example.com': {
    email: 'ama@example.com',
    fullName: 'Ama Mensah',
    displayName: 'Ama Mensah',
    phone: '+233241234567',
  },
  'kofi@example.com': {
    email: 'kofi@example.com',
    fullName: 'Kofi Boateng',
    displayName: 'Kofi Boateng',
    phone: '+233201112233',
  },
};

const STORAGE_KEY = 'smg_customer';
const REGISTRY_KEY = 'smg_customer_registry';

const AuthContext = createContext<AuthState | null>(null);

function nowIso() {
  return new Date().toISOString();
}

function normaliseDemoUser(user: Pick<CustomerUser, 'email' | 'fullName' | 'displayName' | 'phone'>): CustomerUser {
  const now = nowIso();
  return {
    ...user,
    role: 'customer',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    provider: 'demo',
  };
}

function profileFromFirestore(uid: string, data: Record<string, unknown>, fallback: FirebaseUser): CustomerUser {
  const email = String(data.email ?? fallback.email ?? '').trim().toLowerCase();
  const displayName = String(data.displayName ?? fallback.displayName ?? email.split('@')[0] ?? 'SMG Rider');
  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : nowIso();
  const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : createdAt;
  const lastLoginAt = typeof data.lastLoginAt === 'string' ? data.lastLoginAt : updatedAt;

  return {
    uid,
    email,
    displayName,
    fullName: displayName,
    phone: typeof data.phone === 'string' ? data.phone : fallback.phoneNumber ?? '',
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : fallback.photoURL ?? undefined,
    role: typeof data.role === 'string' ? (data.role as AuthRole) : 'customer',
    status: typeof data.status === 'string' ? (data.status as AccountStatus) : 'active',
    createdAt,
    updatedAt,
    lastLoginAt,
    provider: 'firebase',
  };
}

async function syncFirebaseUserProfile(firebaseUser: FirebaseUser): Promise<CustomerUser> {
  const db = await getFirebaseDb();
  if (!db) throw new Error('Firebase Firestore is not configured.');

  const { doc, getDoc, setDoc, updateDoc } = await import('firebase/firestore');
  const uid = firebaseUser.uid;
  const email = firebaseUser.email?.trim().toLowerCase();
  if (!email) throw new Error('Google did not return an email address.');

  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const now = nowIso();
  const displayName = firebaseUser.displayName ?? email.split('@')[0] ?? 'SMG Rider';
  const publicFields = {
    uid,
    displayName,
    email,
    photoURL: firebaseUser.photoURL ?? '',
    updatedAt: now,
    lastLoginAt: now,
  };

  if (snap.exists()) {
    await updateDoc(ref, publicFields);
    const fresh = await getDoc(ref);
    return profileFromFirestore(uid, fresh.data() as Record<string, unknown>, firebaseUser);
  }

  const profile = {
    ...publicFields,
    role: 'customer' satisfies AuthRole,
    status: 'active' satisfies AccountStatus,
    createdAt: now,
  };
  await setDoc(ref, profile);
  return profileFromFirestore(uid, profile, firebaseUser);
}

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((u: CustomerUser | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    async function boot() {
      const auth = await getFirebaseAuth();
      if (!auth) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setUser(JSON.parse(raw) as CustomerUser);
        } catch {
          /* ignore corrupt storage */
        }
        setLoading(false);
        return;
      }

      const { onAuthStateChanged } = await import('firebase/auth');
      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (cancelled) return;
        if (!firebaseUser) {
          persist(null);
          setLoading(false);
          return;
        }

        try {
          const profile = await syncFirebaseUserProfile(firebaseUser);
          persist(profile);
        } catch {
          persist(null);
        } finally {
          setLoading(false);
        }
      });
    }

    boot().catch(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw) as CustomerUser);
      } catch {
        /* ignore */
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [persist]);

  const login = useCallback<AuthState['login']>(async (email, _password) => {
    const key = email.trim().toLowerCase();
    const seeded = SEEDED[key];
    if (seeded) {
      persist(normaliseDemoUser(seeded));
      return { ok: true };
    }
    try {
      const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? '{}') as Record<string, CustomerUser>;
      if (registry[key]) {
        persist({ ...registry[key], lastLoginAt: nowIso(), provider: 'demo' });
        return { ok: true };
      }
    } catch {
      /* ignore */
    }
    return { ok: false, error: 'No account found. Try a demo account, Google, or register first.' };
  }, [persist]);

  const loginWithGoogle = useCallback<AuthState['loginWithGoogle']>(async () => {
    try {
      const auth = await getFirebaseAuth();
      if (!auth) {
        return { ok: false, error: 'Google sign-in is not configured for this preview yet.' };
      }

      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const profile = await syncFirebaseUserProfile(result.user);
      persist(profile);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      return { ok: false, error: message };
    }
  }, [persist]);

  const register = useCallback<AuthState['register']>(async (u) => {
    const key = u.email.trim().toLowerCase();
    try {
      const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? '{}') as Record<string, CustomerUser>;
      const profile = normaliseDemoUser({
        email: key,
        fullName: u.fullName,
        displayName: u.fullName,
        phone: u.phone,
      });
      registry[key] = profile;
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
      persist(profile);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not create the account locally.' };
    }
  }, [persist]);

  const logout = useCallback<AuthState['logout']>(async () => {
    const auth = await getFirebaseAuth();
    if (auth?.currentUser) {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    }
    persist(null);
  }, [persist]);

  const updateProfile = useCallback<AuthState['updateProfile']>(
    async (patch) => {
      if (!user) return { ok: false, error: 'You must be signed in.' };
      const displayName = patch.displayName ?? patch.fullName ?? user.displayName;
      const updated: CustomerUser = {
        ...user,
        displayName,
        fullName: displayName,
        phone: patch.phone ?? user.phone,
        photoURL: patch.photoURL ?? user.photoURL,
        updatedAt: nowIso(),
      };

      if (user.provider === 'firebase' && user.uid) {
        try {
          const db = await getFirebaseDb();
          if (!db) throw new Error('Firebase Firestore is not configured.');
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'users', user.uid), {
            displayName: updated.displayName,
            phone: updated.phone,
            photoURL: updated.photoURL ?? '',
            updatedAt: updated.updatedAt,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not sync profile.';
          return { ok: false, error: message };
        }
      } else {
        try {
          const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? '{}') as Record<string, CustomerUser>;
          registry[user.email] = updated;
          localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
        } catch {
          /* demo registry persistence is best-effort */
        }
      }

      persist(updated);
      return { ok: true };
    },
    [user, persist],
  );

  const value = useMemo(
    () => ({ user, loading, login, loginWithGoogle, register, logout, updateProfile }),
    [user, loading, login, loginWithGoogle, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCustomerAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}
