'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Ticket, CalendarClock, Clock, XCircle, User2, ShieldAlert } from 'lucide-react';
import { useCustomerAuth } from '@/lib/auth/customer-auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton, Alert } from '@/components/ui/misc';
import { BookingStatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import type { Booking } from '@/lib/types';

type Tab = 'upcoming' | 'pending' | 'past' | 'cancelled';

export default function DashboardPage() {
  const { user, loading, logout, updateProfile } = useCustomerAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    setName(currentUser.fullName);
    setPhone(currentUser.phone);
    async function loadBookings() {
      setBookings(null);
      setBookingsError(null);
      const isFirebaseUser = currentUser.provider === 'firebase';
      const auth = isFirebaseUser ? await getFirebaseAuth() : null;
      const token = await auth?.currentUser?.getIdToken().catch(() => undefined);
      if (isFirebaseUser && !token) {
        setBookings([]);
        setBookingsError('We could not verify your sign-in. Please sign out and sign in again.');
        return;
      }
      const res = await fetch('/api/customer/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(currentUser.provider === 'demo' ? { email: currentUser.email } : {}),
      });
      const json = await res.json();
      if (!res.ok) {
        setBookings([]);
        setBookingsError(json.error ?? 'Could not load your bookings. Please try again.');
        return;
      }
      setBookings(json.data?.bookings ?? []);
    }
    loadBookings().catch(() => {
      setBookings([]);
      setBookingsError('Could not load your bookings. Please check your connection and try again.');
    });
  }, [user]);

  if (loading || !user) {
    return (
      <div className="container-page py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const all = bookings ?? [];
  const groups: Record<Tab, Booking[]> = {
    upcoming: all.filter((b) => ['confirmed', 'checked_in', 'rescheduled'].includes(b.status) && b.travelDate >= today),
    pending: all.filter((b) => ['pending_payment', 'payment_processing'].includes(b.status)),
    past: all.filter((b) => b.status === 'completed' || (['confirmed', 'checked_in'].includes(b.status) && b.travelDate < today)),
    cancelled: all.filter((b) => ['cancelled', 'expired', 'payment_failed'].includes(b.status)),
  };

  const TABS: { id: Tab; label: string; icon: typeof Ticket }[] = [
    { id: 'upcoming', label: 'Upcoming', icon: CalendarClock },
    { id: 'pending', label: 'Pending', icon: Clock },
    { id: 'past', label: 'Past trips', icon: Ticket },
    { id: 'cancelled', label: 'Cancelled', icon: XCircle },
  ];

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-navy">Welcome, {user.fullName.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" onClick={() => { logout(); router.push('/'); }}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex flex-wrap gap-2" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-navy text-white' : 'bg-muted text-navy hover:bg-navy/10'
                }`}
              >
                <t.icon className="size-4" /> {t.label}
                <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{groups[t.id].length}</span>
              </button>
            ))}
          </div>

          {bookingsError && <Alert variant="warning" className="mt-4">{bookingsError}</Alert>}

          <div className="mt-4 space-y-3">
            {bookings === null ? (
              <Skeleton className="h-24 w-full" />
            ) : groups[tab].length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No {tab} bookings.{' '}
                  {tab === 'upcoming' && <Link href="/book" className="text-navy underline">Book a trip</Link>}
                </CardContent>
              </Card>
            ) : (
              groups[tab].map((b) => (
                <Card key={b.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-bold text-navy">{b.origin} → {b.destination}</p>
                        <BookingStatusBadge status={b.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(b.travelDate)} · {formatTime(b.departureTime)} · Seat {b.seatIds.join(', ')} · {formatCurrency(b.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">Ref: {b.reference}</p>
                    </div>
                    <div className="flex gap-2">
                      {b.status === 'confirmed' && <Link href={`/ticket/${b.reference}`}><Button size="sm">Ticket</Button></Link>}
                      {b.status === 'pending_payment' && <Link href={`/book/review/${b.reference}`}><Button size="sm">Pay</Button></Link>}
                      <Link href={`/booking/${b.reference}`}><Button size="sm" variant="outline">Details</Button></Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Profile / security */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User2 className="size-5 text-gold" /> Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {editing ? (
                <>
                  <input className="w-full rounded-md border border-input px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" />
                  <input className="w-full rounded-md border border-input px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { updateProfile({ fullName: name, phone }); setEditing(false); }}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <p><span className="text-muted-foreground">Name:</span> {user.fullName}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {user.phone}</p>
                  <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit profile</Button>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="size-4 text-gold" /> Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Password change, email verification and 2-step options are provided via Firebase Auth in production.</p>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => alert('Account deletion request recorded (demo). In production this triggers a verified deletion workflow.')}>
                Request account deletion
              </Button>
            </CardContent>
          </Card>
          <Alert variant="info">
            <span className="text-xs">
              {user.provider === 'demo'
                ? 'Demo bookings are matched by email so the sample dashboard stays easy to explore.'
                : 'This dashboard shows trips booked while signed in. Guest bookings can still be managed by reference and contact detail.'}
            </span>
          </Alert>
        </aside>
      </div>
    </div>
  );
}
