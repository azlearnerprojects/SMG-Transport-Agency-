'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, CheckCircle2, Edit3, Loader2, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { useCustomerAuth } from '@/lib/auth/customer-auth';
import { ROLE_LABELS, STATUS_LABELS } from '@/lib/auth/roles';
import { formatDate, formatTime } from '@/lib/format';
import type { AccountStatus, AuthRole } from '@/lib/types';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleVariant(role: AuthRole) {
  if (role === 'super_admin') return 'gold';
  if (role === 'admin') return 'navy';
  if (role === 'staff' || role === 'staff_pending') return 'info';
  return 'muted';
}

function statusVariant(status: AccountStatus) {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

function ProfileContent() {
  const router = useRouter();
  const { user, updateProfile, logout } = useCustomerAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.fullName);
    setPhone(user.phone);
  }, [user]);

  if (!user) return null;

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    const result = await updateProfile({ fullName: name, phone });
    setSaving(false);
    if (!result.ok) {
      setMessage({ tone: 'danger', text: result.error ?? 'Could not sync profile.' });
      return;
    }
    setEditing(false);
    setMessage({ tone: 'success', text: 'Profile synced successfully.' });
  }

  async function signOut() {
    await logout();
    router.push('/');
  }

  const stats = [
    { label: 'Role', value: <Badge variant={roleVariant(user.role)}>{ROLE_LABELS[user.role]}</Badge>, icon: ShieldCheck },
    { label: 'Status', value: <Badge variant={statusVariant(user.status)}>{STATUS_LABELS[user.status]}</Badge>, icon: CheckCircle2 },
    { label: 'Created', value: formatDate(user.createdAt), icon: CalendarClock },
    { label: 'Last login', value: `${formatDate(user.lastLoginAt)} ${formatTime(user.lastLoginAt)}`, icon: CalendarClock },
  ];

  return (
    <div className="relative overflow-hidden bg-cloud">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_18%_20%,rgba(255,193,7,0.28),transparent_30%),linear-gradient(135deg,#003366_0%,#1a5a96_58%,#001833_100%)]" />
      <div className="container-page relative py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 text-white">
          <div>
            <p className="text-sm font-semibold text-gold">Welcome aboard</p>
            <h1 className="font-heading text-3xl font-extrabold text-white">Your SMG profile</h1>
            <p className="mt-1 text-sm text-white/75">Profile, access, and sign-in details in one clean place.</p>
          </div>
          <Button variant="primary" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>

        {message && (
          <Alert variant={message.tone} className="mb-5">
            {message.text}
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card className="border-white/50 bg-white/85 shadow-card-hover backdrop-blur">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="grid size-28 place-items-center overflow-hidden rounded-full border-4 border-gold bg-navy text-3xl font-heading font-extrabold text-white shadow-card">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt="" className="size-28 object-cover" />
                  ) : (
                    initials(user.fullName)
                  )}
                </div>
                <h2 className="mt-4 font-heading text-2xl font-extrabold text-navy">{user.fullName}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4" /> {user.email}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Badge variant={roleVariant(user.role)}>{ROLE_LABELS[user.role]}</Badge>
                  <Badge variant={statusVariant(user.status)}>{STATUS_LABELS[user.status]}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-white/50 bg-white/85 p-5 shadow-card backdrop-blur transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <item.icon className="size-5 text-gold" />
                  </div>
                  <div className="mt-2 font-heading text-lg font-extrabold text-navy">{item.value}</div>
                </div>
              ))}
            </section>

            <Card className="border-white/50 bg-white/85 shadow-card backdrop-blur">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-extrabold text-navy">Profile details</h2>
                    <p className="text-sm text-muted-foreground">Keep your travel account easy to recognize.</p>
                  </div>
                  {!editing && (
                    <Button variant="outline" onClick={() => setEditing(true)}>
                      <Edit3 className="size-4" /> Edit profile
                    </Button>
                  )}
                </div>

                {editing ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-navy">Full name</span>
                      <Input value={name} onChange={(event) => setName(event.target.value)} />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-navy">Phone</span>
                      <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button onClick={saveProfile} disabled={saving}>
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Save changes
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted p-4">
                      <dt className="text-xs uppercase text-muted-foreground">Full name</dt>
                      <dd className="mt-1 font-semibold text-navy">{user.fullName}</dd>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <dt className="text-xs uppercase text-muted-foreground">Phone</dt>
                      <dd className="mt-1 font-semibold text-navy">{user.phone || 'Not added yet'}</dd>
                    </div>
                    <div className="rounded-lg bg-muted p-4 sm:col-span-2">
                      <dt className="text-xs uppercase text-muted-foreground">Firebase UID</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-navy">{user.uid ?? 'Demo account'}</dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>

            <div className="rounded-lg border border-dashed border-navy/20 bg-white/70 p-5 text-sm text-muted-foreground backdrop-blur">
              <UserRound className="mb-2 size-5 text-gold" />
              Access levels are controlled by Firebase custom claims and Firestore role documents. Profile edits never change your role or account status.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
