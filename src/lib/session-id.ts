'use client';

/**
 * Stable per-browser session id used to scope seat holds to a visitor without
 * requiring an account. Persisted in localStorage.
 */
const KEY = 'smg_session_id';

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
