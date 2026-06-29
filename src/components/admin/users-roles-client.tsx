'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { ACCOUNT_STATUSES, AUTH_ROLES, ROLE_LABELS, STATUS_LABELS } from '@/lib/auth/roles';
import { formatDate, formatTime } from '@/lib/format';
import { Alert } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AccountStatus, AuthRole, StaffRole, UserProfile } from '@/lib/types';

type FilterRole = AuthRole | 'all';
type FilterStatus = AccountStatus | 'all';

interface PendingAction {
  user: UserProfile;
  patch: Partial<Pick<UserProfile, 'role' | 'status'>>;
}

function roleVariant(role: AuthRole) {
  if (role === 'super_admin') return 'gold';
  if (role === 'admin') return 'navy';
  if (role === 'staff') return 'info';
  if (role === 'staff_pending') return 'warning';
  return 'muted';
}

function statusVariant(status: AccountStatus) {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function UsersRolesClient({
  initialUsers,
  configured,
  currentRole,
  currentUid,
}: {
  initialUsers: UserProfile[];
  configured: boolean;
  currentRole: StaffRole;
  currentUid?: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<FilterRole>('all');
  const [status, setStatus] = useState<FilterStatus>('all');
  const [selected, setSelected] = useState<UserProfile | null>(initialUsers[0] ?? null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const canEdit = currentRole === 'super_admin';

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !needle ||
        user.displayName.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle);
      const matchesRole = role === 'all' || user.role === role;
      const matchesStatus = status === 'all' || user.status === status;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, role, status, users]);

  async function confirmUpdate() {
    if (!pending) return;
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/users/${pending.user.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending.patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not update user.');
      const updated = json.data?.user as UserProfile;
      setUsers((current) => current.map((user) => (user.uid === updated.uid ? updated : user)));
      setSelected((current) => (current?.uid === updated.uid ? updated : current));
      setToast({ tone: 'success', text: 'User access updated successfully.' });
      setPending(null);
    } catch (err) {
      setToast({ tone: 'danger', text: err instanceof Error ? err.message : 'Could not update user.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {!configured && (
        <Alert variant="warning" title="Firebase Admin SDK not configured">
          Add the server-side Firebase service account env vars to list and manage Firestore users.
        </Alert>
      )}

      {toast && (
        <Alert variant={toast.tone === 'success' ? 'success' : 'danger'}>
          <span className="flex items-center gap-2">
            {toast.tone === 'success' ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
            {toast.text}
          </span>
        </Alert>
      )}

      <section className="grid gap-3 rounded-lg border border-white/60 bg-white/80 p-4 shadow-card backdrop-blur md:grid-cols-[1fr_180px_180px]">
        <label className="relative block">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </label>
        <label>
          <span className="sr-only">Filter role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as FilterRole)}
            className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-navy"
          >
            <option value="all">All roles</option>
            {AUTH_ROLES.map((item) => (
              <option key={item} value={item}>{ROLE_LABELS[item]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as FilterStatus)}
            className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-navy"
          >
            <option value="all">All statuses</option>
            {ACCOUNT_STATUSES.map((item) => (
              <option key={item} value={item}>{STATUS_LABELS[item]}</option>
            ))}
          </select>
        </label>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="hidden overflow-hidden rounded-lg border border-border bg-white shadow-card md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy text-white">
              <tr>
                {['User', 'Role', 'Status', 'Last login', 'Actions'].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-heading text-xs font-bold uppercase tracking-wide">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No users match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.uid} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setSelected(user)}
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                          {user.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.photoURL} alt="" className="size-10 rounded-full object-cover" />
                          ) : (
                            initials(user.displayName)
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-navy">{user.displayName}</span>
                          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={roleVariant(user.role)}>{ROLE_LABELS[user.role]}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={statusVariant(user.status)}>{STATUS_LABELS[user.status]}</Badge>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(user.lastLoginAt)} {formatTime(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-4">
                      {canEdit ? (
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={user.role}
                            onChange={(event) => setPending({ user, patch: { role: event.target.value as AuthRole } })}
                            disabled={user.uid === currentUid && user.role === 'super_admin'}
                            className="h-9 rounded-md border border-input bg-white px-2 text-xs text-navy"
                            aria-label={`Change role for ${user.displayName}`}
                          >
                            {AUTH_ROLES.map((item) => (
                              <option key={item} value={item}>{ROLE_LABELS[item]}</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant={user.status === 'active' ? 'outline' : 'navy'}
                            disabled={user.uid === currentUid && user.role === 'super_admin'}
                            onClick={() =>
                              setPending({
                                user,
                                patch: { status: user.status === 'active' ? 'disabled' : 'active' },
                              })
                            }
                          >
                            {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="grid gap-3 md:hidden">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted-foreground">
              No users match the current filters.
            </div>
          ) : (
            filtered.map((user) => (
              <article key={user.uid} className="rounded-lg border border-border bg-white p-4 shadow-card">
                <button type="button" onClick={() => setSelected(user)} className="flex w-full items-center gap-3 text-left">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                    {user.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photoURL} alt="" className="size-11 rounded-full object-cover" />
                    ) : (
                      initials(user.displayName)
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy">{user.displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  </span>
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={roleVariant(user.role)}>{ROLE_LABELS[user.role]}</Badge>
                  <Badge variant={statusVariant(user.status)}>{STATUS_LABELS[user.status]}</Badge>
                </div>
                {canEdit && (
                  <div className="mt-4 grid gap-2">
                    <select
                      value={user.role}
                      onChange={(event) => setPending({ user, patch: { role: event.target.value as AuthRole } })}
                      disabled={user.uid === currentUid && user.role === 'super_admin'}
                      className="h-10 rounded-md border border-input bg-white px-2 text-sm text-navy"
                      aria-label={`Change role for ${user.displayName}`}
                    >
                      {AUTH_ROLES.map((item) => (
                        <option key={item} value={item}>{ROLE_LABELS[item]}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant={user.status === 'active' ? 'outline' : 'navy'}
                      disabled={user.uid === currentUid && user.role === 'super_admin'}
                      onClick={() =>
                        setPending({
                          user,
                          patch: { status: user.status === 'active' ? 'disabled' : 'active' },
                        })
                      }
                    >
                      {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </div>
                )}
              </article>
            ))
          )}
        </section>

        <aside className="rounded-lg border border-white/60 bg-white/85 p-5 shadow-card backdrop-blur">
          {selected ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white">
                  {selected.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.photoURL} alt="" className="size-14 rounded-full object-cover" />
                  ) : (
                    initials(selected.displayName)
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-heading text-lg font-extrabold text-navy">{selected.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">{selected.email}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Role</span>
                  <Badge variant={roleVariant(selected.role)}>{ROLE_LABELS[selected.role]}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusVariant(selected.status)}>{STATUS_LABELS[selected.status]}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-right text-navy">{formatDate(selected.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Last login</span>
                  <span className="text-right text-navy">{formatDate(selected.lastLoginAt)} {formatTime(selected.lastLoginAt)}</span>
                </div>
                <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  UID: <span className="break-all font-mono text-navy">{selected.uid}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center text-center text-sm text-muted-foreground">
              <div>
                <UserRound className="mx-auto size-8" />
                <p className="mt-2">Select a user to view details.</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-access-change"
            className="w-full max-w-md rounded-lg border border-white/20 bg-white p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p id="confirm-access-change" className="font-heading text-lg font-extrabold text-navy">
                  Confirm access change
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will update Firebase custom claims and the user profile for {pending.user.email}.
                </p>
              </div>
              <button type="button" onClick={() => setPending(null)} aria-label="Close confirmation" className="text-navy">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
              {pending.patch.role && (
                <p>
                  Role: <strong>{ROLE_LABELS[pending.user.role]}</strong> to <strong>{ROLE_LABELS[pending.patch.role]}</strong>
                </p>
              )}
              {pending.patch.status && (
                <p>
                  Status: <strong>{STATUS_LABELS[pending.user.status]}</strong> to <strong>{STATUS_LABELS[pending.patch.status]}</strong>
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPending(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" variant="navy" onClick={confirmUpdate} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
