import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/lib/db';
import type { Booking } from '@/lib/types';

type FirebaseUser = { uid: string; email?: string };

const passenger = {
  fullName: 'Ama Mensah',
  phone: '0241234567',
  email: 'ama@example.com',
  idType: 'none' as const,
};

const bookingBody = {
  scheduleId: 'sch-1',
  seatIds: ['1A'],
  seatCategory: 'standard',
  passenger,
  boardingPoint: 'Oldsite Terminal',
  sessionId: 'session-1',
  consent: true,
  holdId: 'hold-1',
};

function booking(id: string, patch: Partial<Booking> = {}): Booking {
  return {
    id,
    reference: `SMG-${id.toUpperCase()}`,
    ticketNumber: '',
    scheduleId: 'sch-1',
    routeId: 'route-1',
    busId: 'bus-1',
    seatIds: ['1A'],
    seatCategory: 'standard',
    fareCategory: 'standard',
    passenger,
    origin: 'Cape Coast',
    destination: 'Accra',
    boardingPoint: 'Cape Coast Terminal',
    travelDate: '2026-07-10',
    departureTime: '08:00',
    arrivalTime: '11:00',
    busNumber: 'SMG-101',
    busCategory: 'standard',
    baseFare: 100,
    fees: 5,
    discount: 0,
    total: 105,
    currency: 'GHS',
    status: 'pending_payment',
    paymentStatus: 'initiated',
    rescheduleCount: 0,
    history: [],
    createdAt: `2026-07-09T10:0${id.length}:00.000Z`,
    updatedAt: `2026-07-09T10:0${id.length}:00.000Z`,
    ...patch,
  };
}

async function loadRoutes({
  demoMode,
  db,
  firebaseUser,
  verifyRejectsWith,
}: {
  demoMode: boolean;
  db: Partial<Database>;
  firebaseUser?: FirebaseUser | null;
  verifyRejectsWith?: unknown;
}) {
  vi.resetModules();
  const verifyFirebaseBearer = vi.fn(async (req: Request) => {
    if (verifyRejectsWith) throw verifyRejectsWith;
    return req.headers.get('authorization') ? (firebaseUser ?? null) : null;
  });

  vi.doMock('@/lib/config', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/config')>();
    return { ...actual, DEMO_MODE: demoMode };
  });
  vi.doMock('@/lib/db', () => ({
    getDb: vi.fn(() => db),
  }));
  vi.doMock('@/lib/auth/firebase-request', () => ({
    verifyFirebaseBearer,
  }));
  vi.doMock('@/lib/rate-limit', () => ({
    clientIp: vi.fn(() => 'customer-booking-auth-test'),
    rateLimit: vi.fn(() => ({ allowed: true })),
  }));

  const [{ POST: createBooking }, { POST: customerBookings }] = await Promise.all([
    import('@/app/api/bookings/route'),
    import('@/app/api/customer/bookings/route'),
  ]);

  return { createBooking, customerBookings, verifyFirebaseBearer };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.doUnmock('@/lib/config');
  vi.doUnmock('@/lib/db');
  vi.doUnmock('@/lib/auth/firebase-request');
  vi.doUnmock('@/lib/rate-limit');
});

describe('customer booking auth', () => {
  it('keeps production booking creation as a guest flow when no Firebase bearer is present', async () => {
    const createBooking = vi.fn().mockResolvedValue({ ok: true, booking: booking('guest') });
    const routes = await loadRoutes({
      demoMode: false,
      db: { createBooking },
      firebaseUser: { uid: 'firebase-uid-1', email: 'ama@example.com' },
    });

    const res = await routes.createBooking(
      new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(bookingBody),
      }),
    );

    expect(res.status).toBe(200);
    expect(createBooking).toHaveBeenCalledWith(expect.not.objectContaining({ customerId: expect.any(String) }));
  });

  it('attaches the verified Firebase uid to production bookings', async () => {
    const createBooking = vi.fn().mockResolvedValue({ ok: true, booking: booking('owned') });
    const routes = await loadRoutes({
      demoMode: false,
      db: { createBooking },
      firebaseUser: { uid: 'firebase-uid-1', email: 'ama@example.com' },
    });

    const res = await routes.createBooking(
      new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer valid-id-token',
        },
        body: JSON.stringify(bookingBody),
      }),
    );

    expect(res.status).toBe(200);
    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'firebase-uid-1' }));
  });

  it('does not consult Firebase auth for demo booking creation', async () => {
    const createBooking = vi.fn().mockResolvedValue({ ok: true, booking: booking('demo') });
    const routes = await loadRoutes({
      demoMode: true,
      db: { createBooking },
      firebaseUser: { uid: 'firebase-uid-1', email: 'ama@example.com' },
    });

    const res = await routes.createBooking(
      new Request('http://localhost/api/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ignored-in-demo',
        },
        body: JSON.stringify(bookingBody),
      }),
    );

    expect(res.status).toBe(200);
    expect(routes.verifyFirebaseBearer).not.toHaveBeenCalled();
    expect(createBooking).toHaveBeenCalledWith(expect.not.objectContaining({ customerId: expect.any(String) }));
  });

  it('lists only Firebase-owned customer bookings in production', async () => {
    const owned = booking('owned', { customerId: 'firebase-uid-1' });
    const guestSameEmail = booking('guest', { passenger: { ...passenger, email: 'ama@example.com' } });
    const listBookings = vi.fn(async (filter?: { customerId?: string }) =>
      filter?.customerId === 'firebase-uid-1' ? [owned] : [owned, guestSameEmail],
    );
    const routes = await loadRoutes({
      demoMode: false,
      db: { listBookings },
      firebaseUser: { uid: 'firebase-uid-1', email: 'ama@example.com' },
    });

    const res = await routes.customerBookings(
      new Request('http://localhost/api/customer/bookings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer valid-id-token',
        },
        body: JSON.stringify({ email: 'ama@example.com' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(listBookings).toHaveBeenCalledTimes(1);
    expect(listBookings).toHaveBeenCalledWith({ customerId: 'firebase-uid-1' });
    expect(body.data.bookings).toHaveLength(1);
    expect(body.data.bookings[0].id).toBe(owned.id);
  });

  it('keeps demo customer bookings matched by seeded customer or passenger email', async () => {
    const owned = booking('owned', { customerId: 'cust-1' });
    const guestSameEmail = booking('guest', { passenger: { ...passenger, email: 'ama@example.com' } });
    const unrelated = booking('other', { passenger: { ...passenger, email: 'other@example.com' } });
    const routes = await loadRoutes({
      demoMode: true,
      db: {
        listCustomers: vi.fn().mockResolvedValue([{ id: 'cust-1', email: 'ama@example.com' }]),
        listBookings: vi.fn().mockResolvedValue([owned, guestSameEmail, unrelated]),
      },
    });

    const res = await routes.customerBookings(
      new Request('http://localhost/api/customer/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'ama@example.com' }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.bookings.map((item: Booking) => item.id)).toEqual(['owned', 'guest']);
  });

  it('rejects production customer dashboard requests without a verified Firebase user', async () => {
    const routes = await loadRoutes({
      demoMode: false,
      db: { listBookings: vi.fn() },
      firebaseUser: null,
    });

    const res = await routes.customerBookings(
      new Request('http://localhost/api/customer/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Please sign in to view your bookings.');
  });
});
