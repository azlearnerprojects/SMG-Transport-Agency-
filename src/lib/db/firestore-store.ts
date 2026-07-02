/**
 * Production Firestore adapter.
 *
 * Implements the async `Database` contract on top of Cloud Firestore via the
 * Firebase Admin SDK (server-side only — clients never talk to these
 * collections directly; see firestore.rules). Seat holds, booking creation,
 * payment confirmation, cancellation and rescheduling all run inside Firestore
 * transactions so concurrent requests can never double-book a seat — the same
 * guarantee the single-threaded in-memory store provides in DEMO mode.
 */
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { calculateFare } from '@/lib/fare';
import { canCancel, canReschedule, computeRefund } from '@/lib/booking-rules';
import { generateId, generateReference, generateTicketNumber } from '@/lib/ids';
import { CURRENCY, DEFAULT_POLICY, SEAT_HOLD_TTL_SECONDS } from '@/lib/config';
import type {
  Announcement,
  AppUser,
  AuditLog,
  Booking,
  BookingEvent,
  Bus,
  ContentPage,
  FaqItem,
  PassengerDetails,
  Payment,
  PaymentMethod,
  Promotion,
  Route,
  Schedule,
  SeatCategory,
  SeatHold,
  SeatLayout,
  StaffProfile,
  SupportMessage,
  SystemSettings,
} from '@/lib/types';
import type {
  AdminOverview,
  AdminReports,
  CancellationQuote,
  Database,
  EnrichedSchedule,
  HoldResult,
  SeatStatus,
  TicketVerification,
} from './index';

const COLLECTIONS = {
  routes: 'routes',
  buses: 'buses',
  seatLayouts: 'seatLayouts',
  boardingPoints: 'boardingPoints',
  promotions: 'promotions',
  faqs: 'faqs',
  announcements: 'announcements',
  contentPages: 'contentPages',
  staff: 'staffProfiles',
  customers: 'customers',
  schedules: 'schedules',
  holds: 'seatHolds',
  bookings: 'bookings',
  payments: 'payments',
  supportMessages: 'supportMessages',
  audit: 'auditTrail',
  settings: 'systemSettings',
} as const;

const SETTINGS_DOC = 'settings';
const REF_CACHE_TTL_MS = 30_000;
const LIST_CAP = 500;
const REPORT_CAP = 2_000;

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  cancellationCutoffHours: DEFAULT_POLICY.cancellationCutoffHours,
  reschedulingCutoffHours: DEFAULT_POLICY.reschedulingCutoffHours,
  cancellationFeePercent: DEFAULT_POLICY.cancellationFeePercent,
  maxReschedules: DEFAULT_POLICY.maxReschedules,
  refundProcessingDays: DEFAULT_POLICY.refundProcessingDays,
  nonRefundableFareCategories: [...DEFAULT_POLICY.nonRefundableFareCategories],
  seatHoldTtlSeconds: SEAT_HOLD_TTL_SECONDS,
};

/** Firestore rejects `undefined` field values — drop them recursively. */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry !== undefined) out[key] = stripUndefined(entry);
    }
    return out as T;
  }
  return value;
}

function isActiveHold(hold: SeatHold, nowMs: number): boolean {
  return hold.status === 'active' && new Date(hold.expiresAt).getTime() > nowMs;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface RefCache {
  at: number;
  routes: Route[];
  buses: Bus[];
  layouts: SeatLayout[];
}

class FirestoreStore implements Database {
  private refCache: RefCache | null = null;
  private settingsCache: { at: number; value: SystemSettings } | null = null;

  private async db(): Promise<Firestore> {
    const firestore = await getAdminFirestore();
    if (!firestore) {
      throw new Error(
        'Firestore is not configured. Provide Firebase Admin credentials ' +
          '(GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY), ' +
          'or set NEXT_PUBLIC_DEMO_MODE=true for the in-memory demo store.',
      );
    }
    return firestore;
  }

  private event(type: BookingEvent['type'], message: string, actor = 'system'): BookingEvent {
    return { id: generateId('evt'), type, message, at: new Date().toISOString(), actor };
  }

  /* ------------------------------------------------------------------ */
  /* Reference data (cached reads)                                      */
  /* ------------------------------------------------------------------ */

  private async loadRefData(): Promise<RefCache> {
    if (this.refCache && Date.now() - this.refCache.at < REF_CACHE_TTL_MS) return this.refCache;
    const db = await this.db();
    const [routes, buses, layouts] = await Promise.all([
      db.collection(COLLECTIONS.routes).get(),
      db.collection(COLLECTIONS.buses).get(),
      db.collection(COLLECTIONS.seatLayouts).get(),
    ]);
    this.refCache = {
      at: Date.now(),
      routes: routes.docs.map((d) => d.data() as Route),
      buses: buses.docs.map((d) => d.data() as Bus),
      layouts: layouts.docs.map((d) => d.data() as SeatLayout),
    };
    return this.refCache;
  }

  async getSettings(): Promise<SystemSettings> {
    if (this.settingsCache && Date.now() - this.settingsCache.at < REF_CACHE_TTL_MS) {
      return this.settingsCache.value;
    }
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.settings).doc(SETTINGS_DOC).get();
    const value = { ...DEFAULT_SYSTEM_SETTINGS, ...(snap.data() ?? {}) } as SystemSettings;
    this.settingsCache = { at: Date.now(), value };
    return value;
  }

  async updateSettings(patch: Partial<SystemSettings>): Promise<SystemSettings> {
    const db = await this.db();
    const current = await this.getSettings();
    const next = { ...current, ...stripUndefined(patch) };
    await db.collection(COLLECTIONS.settings).doc(SETTINGS_DOC).set(next, { merge: true });
    this.settingsCache = { at: Date.now(), value: next };
    return next;
  }

  async listRoutes(): Promise<Route[]> {
    return (await this.loadRefData()).routes;
  }

  async listBuses(): Promise<Bus[]> {
    return (await this.loadRefData()).buses;
  }

  async listLayouts(): Promise<SeatLayout[]> {
    return (await this.loadRefData()).layouts;
  }

  async listPromotions(): Promise<Promotion[]> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.promotions).limit(LIST_CAP).get();
    return snap.docs.map((d) => d.data() as Promotion);
  }

  async listFaqs(): Promise<FaqItem[]> {
    const all = await this.listAllFaqs();
    return all.filter((f) => f.published).sort((a, b) => a.order - b.order);
  }

  async listAllFaqs(): Promise<FaqItem[]> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.faqs).limit(LIST_CAP).get();
    return snap.docs.map((d) => d.data() as FaqItem);
  }

  async listAnnouncements(): Promise<Announcement[]> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.announcements).limit(LIST_CAP).get();
    return snap.docs.map((d) => d.data() as Announcement).filter((a) => a.active);
  }

  async listContentPages(): Promise<ContentPage[]> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.contentPages).limit(LIST_CAP).get();
    return snap.docs.map((d) => d.data() as ContentPage);
  }

  async getContentPage(slug: string): Promise<ContentPage | undefined> {
    const pages = await this.listContentPages();
    return pages.find((p) => p.slug === slug);
  }

  async listStaff(): Promise<StaffProfile[]> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.staff).limit(LIST_CAP).get();
    return snap.docs.map((d) => d.data() as StaffProfile);
  }

  async listCustomers(): Promise<AppUser[]> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.customers).limit(LIST_CAP).get();
    return snap.docs.map((d) => d.data() as AppUser);
  }

  async getCities(): Promise<string[]> {
    const routes = await this.listRoutes();
    const set = new Set<string>();
    for (const r of routes) {
      set.add(r.origin);
      set.add(r.destination);
    }
    return [...set].sort();
  }

  async getRoute(id: string): Promise<Route | undefined> {
    return (await this.listRoutes()).find((r) => r.id === id);
  }

  async getBus(id: string): Promise<Bus | undefined> {
    return (await this.listBuses()).find((b) => b.id === id);
  }

  async getLayout(id: string): Promise<SeatLayout | undefined> {
    return (await this.listLayouts()).find((l) => l.id === id);
  }

  async getPromotionByCode(code: string): Promise<Promotion | undefined> {
    const promos = await this.listPromotions();
    return promos.find((p) => p.code.toLowerCase() === code.trim().toLowerCase());
  }

  /* ------------------------------------------------------------------ */
  /* Schedules + availability                                           */
  /* ------------------------------------------------------------------ */

  /** Active (unexpired) holds per schedule id, batched via `in` queries. */
  private async activeHoldsBySchedule(scheduleIds: string[]): Promise<Map<string, SeatHold[]>> {
    const map = new Map<string, SeatHold[]>();
    if (scheduleIds.length === 0) return map;
    const db = await this.db();
    const nowMs = Date.now();
    for (const ids of chunk(scheduleIds, 30)) {
      const snap = await db
        .collection(COLLECTIONS.holds)
        .where('scheduleId', 'in', ids)
        .where('status', '==', 'active')
        .get();
      for (const doc of snap.docs) {
        const hold = doc.data() as SeatHold;
        if (!isActiveHold(hold, nowMs)) continue;
        const list = map.get(hold.scheduleId) ?? [];
        list.push(hold);
        map.set(hold.scheduleId, list);
      }
    }
    return map;
  }

  private enrichWith(
    schedule: Schedule,
    ref: RefCache,
    holds: SeatHold[],
  ): EnrichedSchedule | undefined {
    const route = ref.routes.find((r) => r.id === schedule.routeId);
    const bus = ref.buses.find((b) => b.id === schedule.busId);
    if (!route || !bus) return undefined;
    const layout = ref.layouts.find((l) => l.id === bus.seatLayoutId);
    if (!layout) return undefined;
    const occupied = new Set<string>(schedule.bookedSeatIds);
    for (const id of bus.blockedSeatIds) occupied.add(id);
    for (const hold of holds) for (const id of hold.seatIds) occupied.add(id);
    const availableSeats = layout.capacity - occupied.size;
    const minFare = Math.min(schedule.fares.standard, schedule.fares.business, schedule.fares.vip);
    return { schedule, route, bus, layout, availableSeats, minFare };
  }

  async searchSchedules(params: { origin: string; destination: string; date: string }): Promise<EnrichedSchedule[]> {
    const ref = await this.loadRefData();
    const routeIds = new Set(
      ref.routes.filter((r) => r.origin === params.origin && r.destination === params.destination).map((r) => r.id),
    );
    if (routeIds.size === 0) return [];

    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.schedules).where('date', '==', params.date).get();
    const schedules = snap.docs
      .map((d) => d.data() as Schedule)
      .filter((s) => routeIds.has(s.routeId) && s.status === 'scheduled');

    const holdsBySchedule = await this.activeHoldsBySchedule(schedules.map((s) => s.id));
    return schedules
      .map((s) => this.enrichWith(s, ref, holdsBySchedule.get(s.id) ?? []))
      .filter((s): s is EnrichedSchedule => Boolean(s))
      .sort((a, b) => a.schedule.departureTime.localeCompare(b.schedule.departureTime));
  }

  async getScheduleView(scheduleId: string): Promise<EnrichedSchedule | undefined> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.schedules).doc(scheduleId).get();
    if (!snap.exists) return undefined;
    const schedule = snap.data() as Schedule;
    const ref = await this.loadRefData();
    const holds = (await this.activeHoldsBySchedule([scheduleId])).get(scheduleId) ?? [];
    return this.enrichWith(schedule, ref, holds);
  }

  async listSchedules(): Promise<Schedule[]> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.schedules).orderBy('date', 'asc').limit(REPORT_CAP).get();
    return snap.docs.map((d) => d.data() as Schedule);
  }

  async seatStatuses(scheduleId: string, ownHoldId?: string): Promise<Record<string, SeatStatus>> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.schedules).doc(scheduleId).get();
    const out: Record<string, SeatStatus> = {};
    if (!snap.exists) return out;
    const schedule = snap.data() as Schedule;
    const ref = await this.loadRefData();
    const bus = ref.buses.find((b) => b.id === schedule.busId);
    const layout = bus ? ref.layouts.find((l) => l.id === bus.seatLayoutId) : undefined;

    const blocked = new Set(bus?.blockedSeatIds ?? []);
    const booked = new Set(schedule.bookedSeatIds);
    const holds = (await this.activeHoldsBySchedule([scheduleId])).get(scheduleId) ?? [];
    const heldByOthers = new Set<string>();
    for (const hold of holds) {
      if (hold.id === ownHoldId) continue;
      for (const id of hold.seatIds) heldByOthers.add(id);
    }

    for (const cell of layout?.cells ?? []) {
      if (cell.kind !== 'seat') continue;
      if (booked.has(cell.id)) out[cell.id] = 'booked';
      else if (blocked.has(cell.id)) out[cell.id] = 'blocked';
      else if (heldByOthers.has(cell.id)) out[cell.id] = 'held';
      else out[cell.id] = 'available';
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Seat holds                                                         */
  /* ------------------------------------------------------------------ */

  async holdSeats(params: { scheduleId: string; seatIds: string[]; sessionId: string }): Promise<HoldResult> {
    const db = await this.db();
    const settings = await this.getSettings();
    const ttl = settings.seatHoldTtlSeconds || SEAT_HOLD_TTL_SECONDS;

    return db.runTransaction(async (tx: Transaction) => {
      const scheduleRef = db.collection(COLLECTIONS.schedules).doc(params.scheduleId);
      const scheduleSnap = await tx.get(scheduleRef);
      if (!scheduleSnap.exists) return { ok: false, conflictSeats: [] as string[] };
      const schedule = scheduleSnap.data() as Schedule;

      const busSnap = await tx.get(db.collection(COLLECTIONS.buses).doc(schedule.busId));
      const blocked = new Set<string>((busSnap.data() as Bus | undefined)?.blockedSeatIds ?? []);
      const booked = new Set(schedule.bookedSeatIds);

      const holdsSnap = await tx.get(
        db.collection(COLLECTIONS.holds)
          .where('scheduleId', '==', params.scheduleId)
          .where('status', '==', 'active'),
      );
      const nowMs = Date.now();
      const heldByOthers = new Set<string>();
      const ownActiveRefs: FirebaseFirestore.DocumentReference[] = [];
      for (const doc of holdsSnap.docs) {
        const hold = doc.data() as SeatHold;
        if (!isActiveHold(hold, nowMs)) continue;
        if (hold.sessionId === params.sessionId) ownActiveRefs.push(doc.ref);
        else for (const id of hold.seatIds) heldByOthers.add(id);
      }

      const conflicts = params.seatIds.filter(
        (id) => booked.has(id) || blocked.has(id) || heldByOthers.has(id),
      );
      if (conflicts.length > 0) return { ok: false, conflictSeats: conflicts };

      for (const ref of ownActiveRefs) tx.update(ref, { status: 'released' });

      const hold: SeatHold = {
        id: generateId('hold'),
        scheduleId: params.scheduleId,
        seatIds: [...params.seatIds],
        sessionId: params.sessionId,
        status: 'active',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(nowMs + ttl * 1000).toISOString(),
      };
      tx.set(db.collection(COLLECTIONS.holds).doc(hold.id), stripUndefined(hold));
      return { ok: true, hold };
    });
  }

  async getHold(holdId: string): Promise<SeatHold | undefined> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.holds).doc(holdId).get();
    if (!snap.exists) return undefined;
    const hold = snap.data() as SeatHold;
    if (hold.status === 'active' && !isActiveHold(hold, Date.now())) {
      return { ...hold, status: 'released' };
    }
    return hold;
  }

  async releaseHold(holdId: string): Promise<void> {
    const db = await this.db();
    const ref = db.collection(COLLECTIONS.holds).doc(holdId);
    const snap = await ref.get();
    if (snap.exists && (snap.data() as SeatHold).status === 'active') {
      await ref.update({ status: 'released' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Bookings                                                           */
  /* ------------------------------------------------------------------ */

  private async findBookingRefByReference(reference: string) {
    const db = await this.db();
    const snap = await db
      .collection(COLLECTIONS.bookings)
      .where('reference', '==', reference.trim().toUpperCase())
      .limit(1)
      .get();
    return snap.empty ? undefined : snap.docs[0]!.ref;
  }

  async createBooking(params: {
    scheduleId: string;
    seatIds: string[];
    seatCategory: SeatCategory;
    passenger: PassengerDetails;
    holdId: string;
    sessionId: string;
    promoCode?: string;
    customerId?: string;
  }): Promise<{ ok: boolean; booking?: Booking; error?: string }> {
    const db = await this.db();
    const promo = params.promoCode ? await this.getPromotionByCode(params.promoCode) : undefined;

    return db.runTransaction(async (tx: Transaction) => {
      const holdRef = db.collection(COLLECTIONS.holds).doc(params.holdId);
      const holdSnap = await tx.get(holdRef);
      const hold = holdSnap.exists ? ({ ...(holdSnap.data() as SeatHold), bookingId: holdSnap.get('bookingId') as string | undefined }) : undefined;

      // Idempotency: a given hold yields at most one booking.
      if (hold?.bookingId) {
        const existing = await tx.get(db.collection(COLLECTIONS.bookings).doc(hold.bookingId));
        if (existing.exists) return { ok: true, booking: existing.data() as Booking };
      }

      if (!hold || hold.status !== 'active' || new Date(hold.expiresAt).getTime() <= Date.now()) {
        return { ok: false, error: 'Your seat hold has expired. Please reselect your seats.' };
      }
      if (hold.scheduleId !== params.scheduleId || hold.sessionId !== params.sessionId) {
        return { ok: false, error: 'Seat hold mismatch.' };
      }
      const sameSeats =
        hold.seatIds.length === params.seatIds.length &&
        params.seatIds.every((s) => hold.seatIds.includes(s));
      if (!sameSeats) return { ok: false, error: 'Selected seats do not match your hold.' };

      const scheduleSnap = await tx.get(db.collection(COLLECTIONS.schedules).doc(params.scheduleId));
      if (!scheduleSnap.exists) return { ok: false, error: 'Trip no longer available.' };
      const schedule = scheduleSnap.data() as Schedule;
      if (schedule.status !== 'scheduled') return { ok: false, error: 'Trip no longer available.' };

      const routeSnap = await tx.get(db.collection(COLLECTIONS.routes).doc(schedule.routeId));
      const busSnap = await tx.get(db.collection(COLLECTIONS.buses).doc(schedule.busId));
      if (!routeSnap.exists || !busSnap.exists) return { ok: false, error: 'Trip no longer available.' };
      const route = routeSnap.data() as Route;
      const bus = busSnap.data() as Bus;

      const breakdown = calculateFare({
        fares: schedule.fares,
        category: params.seatCategory,
        seatCount: params.seatIds.length,
        serviceFeePerSeat: schedule.serviceFee,
        promotion: promo,
        routeId: route.id,
        now: new Date(),
      });

      const now = new Date().toISOString();
      const booking: Booking = {
        id: generateId('bk'),
        reference: generateReference(),
        ticketNumber: '',
        scheduleId: schedule.id,
        routeId: route.id,
        busId: bus.id,
        seatIds: [...params.seatIds],
        seatCategory: params.seatCategory,
        fareCategory: params.seatCategory,
        passenger: { ...params.passenger },
        customerId: params.customerId,
        origin: route.origin,
        destination: route.destination,
        boardingPoint: `${route.origin} Terminal`,
        travelDate: schedule.date,
        departureTime: schedule.departureTime,
        arrivalTime: schedule.arrivalTime,
        busNumber: bus.busNumber,
        busCategory: bus.category,
        baseFare: breakdown.baseFare,
        fees: breakdown.fees,
        discount: breakdown.discount,
        total: breakdown.total,
        currency: CURRENCY.code,
        status: 'pending_payment',
        paymentStatus: 'initiated',
        holdId: hold.id,
        promoCode: promo?.code,
        rescheduleCount: 0,
        history: [
          this.event('created', 'Booking created (pending payment).', 'customer'),
          this.event('seat_held', `Seats ${params.seatIds.join(', ')} held.`, 'system'),
        ],
        createdAt: now,
        updatedAt: now,
      };
      tx.set(db.collection(COLLECTIONS.bookings).doc(booking.id), stripUndefined(booking));
      tx.update(holdRef, { bookingId: booking.id });
      return { ok: true, booking };
    });
  }

  async getBookingByReference(reference: string): Promise<Booking | undefined> {
    const db = await this.db();
    // References are stored uppercase (SMG-XXXXXXXX); normalise for lookup.
    const snap = await db
      .collection(COLLECTIONS.bookings)
      .where('reference', '==', reference.trim().toUpperCase())
      .limit(1)
      .get();
    return snap.empty ? undefined : (snap.docs[0]!.data() as Booking);
  }

  async lookupBooking(reference: string, contact: string): Promise<Booking | undefined> {
    const booking = await this.getBookingByReference(reference);
    if (!booking) return undefined;
    const c = contact.trim().toLowerCase().replace(/\s+/g, '');
    const email = booking.passenger.email.toLowerCase();
    const phone = booking.passenger.phone.toLowerCase().replace(/\s+/g, '');
    if (c === email || c === phone) return booking;
    return undefined;
  }

  async listBookings(filter?: { status?: Booking['status']; customerId?: string }): Promise<Booking[]> {
    const db = await this.db();
    let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.bookings);
    if (filter?.customerId) query = query.where('customerId', '==', filter.customerId);
    if (filter?.status) query = query.where('status', '==', filter.status);
    if (filter?.customerId && filter?.status) {
      // Two equality filters merge automatically; sort client-side to avoid a
      // three-field composite index.
      const snap = await query.limit(LIST_CAP).get();
      return snap.docs
        .map((d) => d.data() as Booking)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const snap = await query.orderBy('createdAt', 'desc').limit(LIST_CAP).get();
    return snap.docs.map((d) => d.data() as Booking);
  }

  /* ------------------------------------------------------------------ */
  /* Payments                                                           */
  /* ------------------------------------------------------------------ */

  async recordPaymentInit(params: {
    bookingReference: string;
    provider: string;
    method: PaymentMethod;
    providerReference: string;
  }): Promise<{ ok: boolean; payment?: Payment; error?: string }> {
    const db = await this.db();
    const bookingRef = await this.findBookingRefByReference(params.bookingReference);
    if (!bookingRef) return { ok: false, error: 'Booking not found.' };

    return db.runTransaction(async (tx: Transaction) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) return { ok: false, error: 'Booking not found.' };
      const booking = bookingSnap.data() as Booking;

      const paymentsSnap = await tx.get(
        db.collection(COLLECTIONS.payments).where('bookingId', '==', booking.id),
      );
      const existing = paymentsSnap.docs
        .map((d) => d.data() as Payment)
        .find((p) => ['initiated', 'pending'].includes(p.status));

      const now = new Date().toISOString();
      let payment: Payment;
      if (!existing) {
        payment = {
          id: generateId('pay'),
          bookingId: booking.id,
          reference: params.providerReference,
          provider: params.provider,
          method: params.method,
          amount: booking.total,
          currency: booking.currency,
          status: 'pending',
          providerReference: params.providerReference,
          idempotencyKey: `${booking.id}:${params.providerReference}`,
          createdAt: now,
          updatedAt: now,
        };
        tx.set(db.collection(COLLECTIONS.payments).doc(payment.id), stripUndefined(payment));
      } else {
        payment = {
          ...existing,
          providerReference: params.providerReference,
          reference: params.providerReference,
          method: params.method,
          updatedAt: now,
        };
        tx.set(db.collection(COLLECTIONS.payments).doc(payment.id), stripUndefined(payment));
      }

      tx.update(bookingRef, {
        paymentId: payment.id,
        paymentStatus: 'pending',
        status: 'payment_processing',
        history: [
          ...booking.history,
          this.event('payment_initiated', `Payment initiated via ${params.method}.`, 'customer'),
        ],
        updatedAt: now,
      });
      return { ok: true, payment };
    });
  }

  async confirmPayment(params: {
    providerReference: string;
    bookingReference?: string;
  }): Promise<{ ok: boolean; booking?: Booking; error?: string }> {
    const db = await this.db();

    // Locate the payment and/or booking outside the transaction, then re-read
    // both inside it for a consistent snapshot.
    const paymentSnap = await db
      .collection(COLLECTIONS.payments)
      .where('providerReference', '==', params.providerReference)
      .limit(1)
      .get();
    let paymentRef = paymentSnap.empty ? undefined : paymentSnap.docs[0]!.ref;
    let bookingRef: FirebaseFirestore.DocumentReference | undefined;
    if (!paymentSnap.empty) {
      const payment = paymentSnap.docs[0]!.data() as Payment;
      bookingRef = db.collection(COLLECTIONS.bookings).doc(payment.bookingId);
    } else if (params.bookingReference) {
      bookingRef = await this.findBookingRefByReference(params.bookingReference);
    }
    if (!bookingRef) return { ok: false, error: 'Booking not found for this reference.' };

    return db.runTransaction(async (tx: Transaction) => {
      const bookingSnap = await tx.get(bookingRef!);
      if (!bookingSnap.exists) return { ok: false, error: 'Booking not found for this reference.' };
      const booking = bookingSnap.data() as Booking;

      if (!paymentRef && booking.paymentId) {
        paymentRef = db.collection(COLLECTIONS.payments).doc(booking.paymentId);
      }
      const paymentInTx = paymentRef ? await tx.get(paymentRef) : undefined;

      if (booking.status === 'confirmed' || booking.paymentStatus === 'successful') {
        return { ok: true, booking }; // idempotent
      }

      const scheduleRef = db.collection(COLLECTIONS.schedules).doc(booking.scheduleId);
      const scheduleSnap = await tx.get(scheduleRef);
      if (!scheduleSnap.exists) return { ok: false, error: 'Trip no longer available.' };
      const schedule = scheduleSnap.data() as Schedule;

      const now = new Date().toISOString();

      // Defensive re-check: ensure the seats were not taken since the hold.
      const booked = new Set(schedule.bookedSeatIds);
      const taken = booking.seatIds.filter((s) => booked.has(s));
      if (taken.length > 0) {
        tx.update(bookingRef!, {
          status: 'payment_failed',
          paymentStatus: 'failed',
          history: [
            ...booking.history,
            this.event('payment_failed', `Seats ${taken.join(', ')} were taken. Payment must be reversed.`, 'system'),
          ],
          updatedAt: now,
        });
        return { ok: false, error: 'Selected seats are no longer available.' };
      }

      // Convert hold -> permanent booked seats.
      tx.update(scheduleRef, {
        bookedSeatIds: [...new Set([...schedule.bookedSeatIds, ...booking.seatIds])],
        updatedAt: now,
      });
      if (booking.holdId) {
        tx.set(db.collection(COLLECTIONS.holds).doc(booking.holdId), { status: 'converted' }, { merge: true });
      }
      if (paymentInTx?.exists) {
        tx.update(paymentRef!, { status: 'successful', verifiedAt: now, updatedAt: now });
      }

      const ticketNumber = booking.ticketNumber || generateTicketNumber();
      const updated: Booking = {
        ...booking,
        ticketNumber,
        status: 'confirmed',
        paymentStatus: 'successful',
        history: [
          ...booking.history,
          this.event('payment_succeeded', 'Payment verified on the server.', 'system'),
          this.event('confirmed', 'Booking confirmed. E-ticket issued.', 'system'),
        ],
        updatedAt: now,
      };
      tx.set(bookingRef!, stripUndefined(updated));
      return { ok: true, booking: updated };
    });
  }

  async failPayment(bookingReference: string, reason: string): Promise<void> {
    const db = await this.db();
    const bookingRef = await this.findBookingRefByReference(bookingReference);
    if (!bookingRef) return;

    await db.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) return;
      const booking = snap.data() as Booking;
      const now = new Date().toISOString();
      const paymentRef = booking.paymentId
        ? db.collection(COLLECTIONS.payments).doc(booking.paymentId)
        : undefined;
      const paymentSnap = paymentRef ? await tx.get(paymentRef) : undefined;

      tx.update(bookingRef, {
        paymentStatus: 'failed',
        status: 'payment_failed',
        history: [...booking.history, this.event('payment_failed', reason, 'system')],
        updatedAt: now,
      });
      if (paymentRef && paymentSnap?.exists) {
        tx.update(paymentRef, { status: 'failed', updatedAt: now });
      }
    });
  }

  async listPayments(): Promise<Payment[]> {
    const db = await this.db();
    const snap = await db
      .collection(COLLECTIONS.payments)
      .orderBy('createdAt', 'desc')
      .limit(LIST_CAP)
      .get();
    return snap.docs.map((d) => d.data() as Payment);
  }

  /* ------------------------------------------------------------------ */
  /* Cancellation / rescheduling                                        */
  /* ------------------------------------------------------------------ */

  async cancelBooking(reference: string, actor = 'customer') {
    const db = await this.db();
    const settings = await this.getSettings();
    const bookingRef = await this.findBookingRefByReference(reference);
    if (!bookingRef) return { ok: false, error: 'Booking not found.' };

    return db.runTransaction(async (tx: Transaction) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) return { ok: false, error: 'Booking not found.' };
      const booking = bookingSnap.data() as Booking;

      const scheduleRef = db.collection(COLLECTIONS.schedules).doc(booking.scheduleId);
      const scheduleSnap = await tx.get(scheduleRef);
      if (!scheduleSnap.exists) return { ok: false, error: 'Trip not found.' };
      const schedule = scheduleSnap.data() as Schedule;

      const eligibility = canCancel(booking, schedule, settings, new Date());
      if (!eligibility.allowed) return { ok: false, error: eligibility.reason };

      const refund = computeRefund(booking, settings);
      const now = new Date().toISOString();

      // Free the seats (do NOT delete the original booking record).
      tx.update(scheduleRef, {
        bookedSeatIds: schedule.bookedSeatIds.filter((s) => !booking.seatIds.includes(s)),
        updatedAt: now,
      });

      const updated: Booking = {
        ...booking,
        status: 'cancelled',
        paymentStatus: refund.refundable ? 'refunded' : booking.paymentStatus,
        history: [
          ...booking.history,
          this.event('cancel_requested', 'Cancellation requested.', actor),
          this.event('cancelled', `Booking cancelled. Refund: ${CURRENCY.symbol}${refund.refundAmount.toFixed(2)}.`, 'system'),
        ],
        updatedAt: now,
      };
      tx.set(bookingRef, stripUndefined(updated));
      return { ok: true, booking: updated, refund };
    });
  }

  async rescheduleBooking(reference: string, newScheduleId: string, newSeatIds: string[], actor = 'customer') {
    const db = await this.db();
    const settings = await this.getSettings();
    const bookingRef = await this.findBookingRefByReference(reference);
    if (!bookingRef) return { ok: false, error: 'Booking not found.' };

    return db.runTransaction(async (tx: Transaction) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) return { ok: false, error: 'Booking not found.' };
      const booking = bookingSnap.data() as Booking;

      const currentScheduleRef = db.collection(COLLECTIONS.schedules).doc(booking.scheduleId);
      const currentSnap = await tx.get(currentScheduleRef);
      if (!currentSnap.exists) return { ok: false, error: 'Current trip not found.' };
      const currentSchedule = currentSnap.data() as Schedule;

      const eligibility = canReschedule(booking, currentSchedule, settings, new Date());
      if (!eligibility.allowed) return { ok: false, error: eligibility.reason };

      const newScheduleRef = db.collection(COLLECTIONS.schedules).doc(newScheduleId);
      const newSnap = await tx.get(newScheduleRef);
      if (!newSnap.exists) return { ok: false, error: 'New trip not available.' };
      const newSchedule = newSnap.data() as Schedule;
      if (newSchedule.status !== 'scheduled') return { ok: false, error: 'New trip not available.' };

      const routeSnap = await tx.get(db.collection(COLLECTIONS.routes).doc(newSchedule.routeId));
      const busSnap = await tx.get(db.collection(COLLECTIONS.buses).doc(newSchedule.busId));
      if (!routeSnap.exists || !busSnap.exists) return { ok: false, error: 'New trip not available.' };
      const route = routeSnap.data() as Route;
      const bus = busSnap.data() as Bus;

      const holdsSnap = await tx.get(
        db.collection(COLLECTIONS.holds)
          .where('scheduleId', '==', newScheduleId)
          .where('status', '==', 'active'),
      );
      const nowMs = Date.now();
      const occupied = new Set<string>(newSchedule.bookedSeatIds);
      for (const id of bus.blockedSeatIds) occupied.add(id);
      for (const doc of holdsSnap.docs) {
        const hold = doc.data() as SeatHold;
        if (!isActiveHold(hold, nowMs)) continue;
        for (const id of hold.seatIds) occupied.add(id);
      }
      const conflicts = newSeatIds.filter((s) => occupied.has(s));
      if (conflicts.length > 0) {
        return { ok: false, error: `Seats ${conflicts.join(', ')} not available on the new trip.` };
      }

      const now = new Date().toISOString();
      // Free old seats, reserve new ones. Keep the same booking record.
      const sameSchedule = currentScheduleRef.path === newScheduleRef.path;
      const freedOld = currentSchedule.bookedSeatIds.filter((s) => !booking.seatIds.includes(s));
      if (sameSchedule) {
        tx.update(currentScheduleRef, {
          bookedSeatIds: [...new Set([...freedOld, ...newSeatIds])],
          updatedAt: now,
        });
      } else {
        tx.update(currentScheduleRef, { bookedSeatIds: freedOld, updatedAt: now });
        tx.update(newScheduleRef, {
          bookedSeatIds: [...new Set([...newSchedule.bookedSeatIds, ...newSeatIds])],
          updatedAt: now,
        });
      }

      const updated: Booking = {
        ...booking,
        scheduleId: newScheduleId,
        routeId: route.id,
        busId: bus.id,
        seatIds: [...newSeatIds],
        origin: route.origin,
        destination: route.destination,
        travelDate: newSchedule.date,
        departureTime: newSchedule.departureTime,
        arrivalTime: newSchedule.arrivalTime,
        busNumber: bus.busNumber,
        busCategory: bus.category,
        rescheduleCount: booking.rescheduleCount + 1,
        status: 'confirmed',
        history: [
          ...booking.history,
          this.event('reschedule_requested', `Reschedule to ${route.origin} → ${route.destination} on ${newSchedule.date}.`, actor),
          this.event('rescheduled', 'Booking rescheduled.', 'system'),
        ],
        updatedAt: now,
      };
      tx.set(bookingRef, stripUndefined(updated));
      return { ok: true, booking: updated };
    });
  }

  async cancellationQuote(reference: string): Promise<CancellationQuote | undefined> {
    const booking = await this.getBookingByReference(reference);
    if (!booking) return undefined;
    const db = await this.db();
    const scheduleSnap = await db.collection(COLLECTIONS.schedules).doc(booking.scheduleId).get();
    if (!scheduleSnap.exists) return undefined;
    const schedule = scheduleSnap.data() as Schedule;
    const settings = await this.getSettings();
    return {
      eligibility: canCancel(booking, schedule, settings, new Date()),
      reschedule: canReschedule(booking, schedule, settings, new Date()),
      refund: computeRefund(booking, settings),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Ticket verification (staff)                                        */
  /* ------------------------------------------------------------------ */

  async verifyTicket(reference: string): Promise<TicketVerification> {
    const b = await this.getBookingByReference(reference);
    if (!b) return { found: false };
    const valid = b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'completed';
    return {
      found: true,
      valid,
      reference: b.reference,
      ticketNumber: b.ticketNumber,
      passenger: b.passenger.fullName,
      route: `${b.origin} → ${b.destination}`,
      travelDate: b.travelDate,
      departureTime: b.departureTime,
      seats: b.seatIds,
      busNumber: b.busNumber,
      status: b.status,
    };
  }

  async checkIn(reference: string): Promise<{ ok: boolean; error?: string }> {
    const db = await this.db();
    const bookingRef = await this.findBookingRefByReference(reference);
    if (!bookingRef) return { ok: false, error: 'Booking not found.' };

    return db.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists) return { ok: false, error: 'Booking not found.' };
      const booking = snap.data() as Booking;
      if (booking.status !== 'confirmed') {
        return { ok: false, error: `Cannot check in a "${booking.status}" booking.` };
      }
      tx.update(bookingRef, {
        status: 'checked_in',
        history: [...booking.history, this.event('note', 'Passenger checked in at terminal.', 'staff')],
        updatedAt: new Date().toISOString(),
      });
      return { ok: true };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Support messages + audit                                           */
  /* ------------------------------------------------------------------ */

  async addSupportMessage(msg: Omit<SupportMessage, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<SupportMessage> {
    const db = await this.db();
    const now = new Date().toISOString();
    const record: SupportMessage = { ...msg, id: generateId('msg'), status: 'new', createdAt: now, updatedAt: now };
    await db.collection(COLLECTIONS.supportMessages).doc(record.id).set(stripUndefined(record));
    return record;
  }

  async listSupportMessages(): Promise<SupportMessage[]> {
    const db = await this.db();
    const snap = await db
      .collection(COLLECTIONS.supportMessages)
      .orderBy('createdAt', 'desc')
      .limit(LIST_CAP)
      .get();
    return snap.docs.map((d) => d.data() as SupportMessage);
  }

  async addAudit(entry: Omit<AuditLog, 'id' | 'at'>): Promise<void> {
    const db = await this.db();
    const record: AuditLog = { ...entry, id: generateId('aud'), at: new Date().toISOString() };
    await db.collection(COLLECTIONS.audit).doc(record.id).set(stripUndefined(record));
  }

  async listAuditLogs(): Promise<AuditLog[]> {
    const db = await this.db();
    const snap = await db.collection(COLLECTIONS.audit).orderBy('at', 'desc').limit(LIST_CAP).get();
    return snap.docs.map((d) => d.data() as AuditLog);
  }

  /* ------------------------------------------------------------------ */
  /* Admin overview + reports                                           */
  /* ------------------------------------------------------------------ */

  private async listAllBookingsForReports(): Promise<Booking[]> {
    const db = await this.db();
    const snap = await db
      .collection(COLLECTIONS.bookings)
      .orderBy('createdAt', 'desc')
      .limit(REPORT_CAP)
      .get();
    return snap.docs.map((d) => d.data() as Booking);
  }

  /** Occupancy across upcoming scheduled trips (booked + blocked seats; transient holds excluded). */
  private occupancyRate(schedules: Schedule[], ref: RefCache): number {
    const upcoming = schedules.filter((s) => s.status === 'scheduled');
    if (upcoming.length === 0) return 0;
    let cap = 0;
    let occ = 0;
    for (const s of upcoming) {
      const bus = ref.buses.find((b) => b.id === s.busId);
      const layout = bus ? ref.layouts.find((l) => l.id === bus.seatLayoutId) : undefined;
      if (!layout) continue;
      cap += layout.capacity;
      occ += new Set([...s.bookedSeatIds, ...(bus?.blockedSeatIds ?? [])]).size;
    }
    return cap === 0 ? 0 : Math.round((occ / cap) * 100);
  }

  async overview(): Promise<AdminOverview> {
    const [bookings, schedules, ref] = await Promise.all([
      this.listAllBookingsForReports(),
      this.listSchedules(),
      this.loadRefData(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const confirmed = bookings.filter((b) => ['confirmed', 'checked_in', 'completed'].includes(b.status));
    const revenue = confirmed.reduce((sum, b) => sum + b.total, 0);
    const upcoming = schedules.filter((s) => s.date >= today && s.status === 'scheduled');
    return {
      totalBookings: bookings.length,
      todaysBookings: bookings.filter((b) => b.createdAt.slice(0, 10) === today).length,
      upcomingDepartures: upcoming.length,
      revenue,
      pendingPayments: bookings.filter((b) => ['pending_payment', 'payment_processing'].includes(b.status)).length,
      cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
      activeBuses: ref.buses.filter((b) => b.status === 'active').length,
      seatOccupancyRate: this.occupancyRate(schedules, ref),
      routesNeedingAttention: schedules.filter((s) => s.status === 'paused' || s.status === 'cancelled').length,
    };
  }

  async reports(): Promise<AdminReports> {
    const [bookings, schedules, ref, payments] = await Promise.all([
      this.listAllBookingsForReports(),
      this.listSchedules(),
      this.loadRefData(),
      this.listPayments(),
    ]);
    const confirmed = bookings.filter((b) => ['confirmed', 'checked_in', 'completed'].includes(b.status));
    const byRoute = new Map<string, { route: string; bookings: number; revenue: number }>();
    const byBus = new Map<string, { bus: string; bookings: number; revenue: number }>();
    const byDate = new Map<string, { date: string; bookings: number; revenue: number }>();
    const byMethod = new Map<string, number>();

    for (const b of confirmed) {
      const routeKey = `${b.origin} → ${b.destination}`;
      const r = byRoute.get(routeKey) ?? { route: routeKey, bookings: 0, revenue: 0 };
      r.bookings += 1;
      r.revenue += b.total;
      byRoute.set(routeKey, r);

      const bu = byBus.get(b.busNumber) ?? { bus: b.busNumber, bookings: 0, revenue: 0 };
      bu.bookings += 1;
      bu.revenue += b.total;
      byBus.set(b.busNumber, bu);

      const d = byDate.get(b.travelDate) ?? { date: b.travelDate, bookings: 0, revenue: 0 };
      d.bookings += 1;
      d.revenue += b.total;
      byDate.set(b.travelDate, d);
    }
    for (const p of payments) {
      if (p.status === 'successful') byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + 1);
    }

    return {
      revenueByRoute: [...byRoute.values()].sort((a, b) => b.revenue - a.revenue),
      revenueByBus: [...byBus.values()].sort((a, b) => b.revenue - a.revenue),
      revenueByDate: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
      paymentMethods: [...byMethod.entries()].map(([method, count]) => ({ method, count })),
      popularRoutes: [...byRoute.values()].sort((a, b) => b.bookings - a.bookings).slice(0, 5),
      cancellations: bookings.filter((b) => b.status === 'cancelled').length,
      refunds: bookings.filter((b) => ['refunded', 'partially_refunded'].includes(b.paymentStatus)).length,
      totalRevenue: confirmed.reduce((s, b) => s + b.total, 0),
      occupancyRate: this.occupancyRate(schedules, ref),
    };
  }
}

const g = globalThis as unknown as { __smgFirestoreStore?: FirestoreStore };

/** Singleton accessor — reuses the reference-data cache across requests. */
export function getFirestoreStore(): Database {
  if (!g.__smgFirestoreStore) g.__smgFirestoreStore = new FirestoreStore();
  return g.__smgFirestoreStore;
}
