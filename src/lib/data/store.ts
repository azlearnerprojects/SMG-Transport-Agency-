/**
 * In-memory mock data store powering DEMO mode.
 *
 * Why in-memory: it lets the entire platform run with zero external services so
 * the booking journey, dashboards and admin can be demonstrated immediately.
 *
 * Concurrency note: Node runs this single-threaded, so each synchronous mutation
 * method is effectively a critical section — seat holds and confirmation re-check
 * availability before committing, which is the same guarantee a Firestore
 * transaction provides in production. State is attached to globalThis so it
 * survives Next.js hot-reloads during development.
 */
import type {
  Announcement,
  Booking,
  BookingEvent,
  Bus,
  ContentPage,
  FareCategoryConfig,
  FaqItem,
  Payment,
  PaymentMethod,
  Promotion,
  Route,
  Schedule,
  SeatCategory,
  SeatHold,
  SeatLayout,
  SupportMessage,
  AuditLog,
} from '../types';
import { buildSeed, type SeedData } from './seed';
import type { DeletableEntity } from '../db';
import { calculateFare } from '../fare';
import { canCancel, canReschedule, computeRefund } from '../booking-rules';
import { generateId, generateReference, generateTicketNumber } from '../ids';
import { CURRENCY, SEAT_HOLD_TTL_SECONDS } from '../config';
import { PassengerDetails } from '../types';
import { isPublicRoute } from '../public-data';

export type SeatStatus = 'available' | 'booked' | 'blocked' | 'held';

export interface EnrichedSchedule {
  schedule: Schedule;
  route: Route;
  bus: Bus;
  layout: SeatLayout;
  availableSeats: number;
  minFare: number;
}

export interface HoldResult {
  ok: boolean;
  hold?: SeatHold;
  conflictSeats?: string[];
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

class MockStore {
  private data: SeedData;
  private holds = new Map<string, SeatHold>();
  private bookings = new Map<string, Booking>();
  private payments = new Map<string, Payment>();
  private supportMessages = new Map<string, SupportMessage>();
  private auditLogs: AuditLog[] = [];
  private holdToBooking = new Map<string, string>(); // idempotency for booking creation

  constructor() {
    this.data = buildSeed(new Date());
    this.seedSampleBookings();
  }

  /* ------------------------------------------------------------------ */
  /* Reference data (read)                                              */
  /* ------------------------------------------------------------------ */

  get settings() {
    return this.data.settings;
  }

  updateSettings(patch: Partial<SeedData['settings']>) {
    this.data.settings = { ...this.data.settings, ...patch };
    return clone(this.data.settings);
  }

  listRoutes(): Route[] {
    return clone(this.data.routes);
  }

  listBuses(): Bus[] {
    return clone(this.data.buses);
  }

  listLayouts(): SeatLayout[] {
    return clone(this.data.seatLayouts);
  }

  listFareCategories(): FareCategoryConfig[] {
    return clone(this.data.fareCategories);
  }

  listPromotions(): Promotion[] {
    return clone(this.data.promotions);
  }

  listFaqs() {
    return clone(this.data.faqs.filter((f) => f.published).sort((a, b) => a.order - b.order));
  }

  listAllFaqs() {
    return clone(this.data.faqs);
  }

  listAnnouncements() {
    return clone(this.data.announcements.filter((a) => a.active));
  }

  listAllAnnouncements() {
    return clone(this.data.announcements);
  }

  listContentPages() {
    return clone(this.data.contentPages);
  }

  getContentPage(slug: string) {
    return clone(this.data.contentPages.find((p) => p.slug === slug));
  }

  listStaff() {
    return clone(this.data.staff);
  }

  listCustomers() {
    return clone(this.data.users);
  }

  getCities(): string[] {
    const set = new Set<string>();
    for (const r of this.data.routes.filter(isPublicRoute)) {
      set.add(r.origin);
      set.add(r.destination);
    }
    return [...set].sort();
  }

  getRoute(id: string) {
    return this.data.routes.find((r) => r.id === id);
  }

  getBus(id: string) {
    return this.data.buses.find((b) => b.id === id);
  }

  getLayout(id: string) {
    return this.data.seatLayouts.find((l) => l.id === id);
  }

  getPromotionByCode(code: string): Promotion | undefined {
    return this.data.promotions.find((p) => p.code.toLowerCase() === code.trim().toLowerCase());
  }

  upsertRoute(id: string | undefined, input: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Route {
    const now = new Date().toISOString();
    const existingIndex = id ? this.data.routes.findIndex((route) => route.id === id) : -1;
    const existing = existingIndex >= 0 ? this.data.routes[existingIndex] : undefined;
    const route: Route = {
      ...input,
      id: existing?.id ?? id ?? generateId('route'),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) this.data.routes[existingIndex] = route;
    else this.data.routes.unshift(route);
    return clone(route);
  }

  upsertBus(id: string | undefined, input: Omit<Bus, 'id' | 'capacity' | 'createdAt' | 'updatedAt'>): Bus {
    const now = new Date().toISOString();
    const existingIndex = id ? this.data.buses.findIndex((bus) => bus.id === id) : -1;
    const existing = existingIndex >= 0 ? this.data.buses[existingIndex] : undefined;
    const layout = this.data.seatLayouts.find((item) => item.id === input.seatLayoutId);
    const bus: Bus = {
      ...input,
      id: existing?.id ?? id ?? generateId('bus'),
      capacity: layout?.capacity ?? existing?.capacity ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) this.data.buses[existingIndex] = bus;
    else this.data.buses.unshift(bus);
    return clone(bus);
  }

  upsertLayout(id: string | undefined, input: Omit<SeatLayout, 'id' | 'createdAt' | 'updatedAt'>): SeatLayout {
    const now = new Date().toISOString();
    const existingIndex = id ? this.data.seatLayouts.findIndex((layout) => layout.id === id) : -1;
    const existing = existingIndex >= 0 ? this.data.seatLayouts[existingIndex] : undefined;
    const layout: SeatLayout = {
      ...input,
      id: existing?.id ?? id ?? generateId('layout'),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) this.data.seatLayouts[existingIndex] = layout;
    else this.data.seatLayouts.unshift(layout);
    return clone(layout);
  }

  upsertFareCategory(id: string | undefined, input: Omit<FareCategoryConfig, 'id' | 'createdAt' | 'updatedAt'>): FareCategoryConfig {
    const now = new Date().toISOString();
    const recordId = input.key;
    const existingIndex = this.data.fareCategories.findIndex((category) => category.id === (id ?? recordId));
    const existing = existingIndex >= 0 ? this.data.fareCategories[existingIndex] : undefined;
    const category: FareCategoryConfig = {
      ...input,
      id: recordId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) this.data.fareCategories[existingIndex] = category;
    else this.data.fareCategories.push(category);
    this.data.fareCategories.sort((a, b) => a.order - b.order);
    return clone(category);
  }

  upsertSchedule(id: string | undefined, input: Omit<Schedule, 'id' | 'bookedSeatIds' | 'createdAt' | 'updatedAt'>): Schedule {
    const now = new Date().toISOString();
    const existingIndex = id ? this.data.schedules.findIndex((schedule) => schedule.id === id) : -1;
    const existing = existingIndex >= 0 ? this.data.schedules[existingIndex] : undefined;
    const schedule: Schedule = {
      ...input,
      id: existing?.id ?? id ?? generateId('sch'),
      bookedSeatIds: existing?.bookedSeatIds ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) this.data.schedules[existingIndex] = schedule;
    else this.data.schedules.unshift(schedule);
    return clone(schedule);
  }

  upsertPromotion(id: string | undefined, input: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promotion {
    const now = new Date().toISOString();
    const existingIndex = id ? this.data.promotions.findIndex((promo) => promo.id === id) : -1;
    const existing = existingIndex >= 0 ? this.data.promotions[existingIndex] : undefined;
    const promotion: Promotion = {
      ...input,
      id: existing?.id ?? id ?? generateId('promo'),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) this.data.promotions[existingIndex] = promotion;
    else this.data.promotions.unshift(promotion);
    return clone(promotion);
  }

  upsertFaq(id: string | undefined, input: Omit<FaqItem, 'id' | 'createdAt' | 'updatedAt'>): FaqItem {
    const now = new Date().toISOString();
    const existingIndex = id ? this.data.faqs.findIndex((faq) => faq.id === id) : -1;
    const existing = existingIndex >= 0 ? this.data.faqs[existingIndex] : undefined;
    const faq: FaqItem = {
      ...input,
      id: existing?.id ?? id ?? generateId('faq'),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) this.data.faqs[existingIndex] = faq;
    else this.data.faqs.unshift(faq);
    return clone(faq);
  }

  upsertAnnouncement(id: string | undefined, input: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Announcement {
    const now = new Date().toISOString();
    const existingIndex = id ? this.data.announcements.findIndex((announcement) => announcement.id === id) : -1;
    const existing = existingIndex >= 0 ? this.data.announcements[existingIndex] : undefined;
    const announcement: Announcement = {
      ...input,
      id: existing?.id ?? id ?? generateId('ann'),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) this.data.announcements[existingIndex] = announcement;
    else this.data.announcements.unshift(announcement);
    return clone(announcement);
  }

  upsertContentPage(id: string | undefined, input: Omit<ContentPage, 'id' | 'createdAt' | 'updatedAt'>): ContentPage {
    const now = new Date().toISOString();
    const existingIndex = id ? this.data.contentPages.findIndex((page) => page.id === id) : -1;
    const existing = existingIndex >= 0 ? this.data.contentPages[existingIndex] : undefined;
    const page: ContentPage = {
      ...input,
      id: existing?.id ?? id ?? generateId('page'),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existingIndex >= 0) this.data.contentPages[existingIndex] = page;
    else this.data.contentPages.unshift(page);
    return clone(page);
  }

  deleteEntity(kind: DeletableEntity, id: string): boolean {
    const arrays: Record<DeletableEntity, { id: string }[]> = {
      route: this.data.routes,
      bus: this.data.buses,
      seatLayout: this.data.seatLayouts,
      fareCategory: this.data.fareCategories,
      schedule: this.data.schedules,
      promotion: this.data.promotions,
      faq: this.data.faqs,
      announcement: this.data.announcements,
      contentPage: this.data.contentPages,
    };
    const list = arrays[kind];
    const index = list.findIndex((item) => item.id === id);
    if (index < 0) return false;
    list.splice(index, 1);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Schedules + availability                                          */
  /* ------------------------------------------------------------------ */

  private enrich(schedule: Schedule): EnrichedSchedule | undefined {
    const route = this.getRoute(schedule.routeId);
    const bus = this.getBus(schedule.busId);
    if (!route || !bus) return undefined;
    const layout = this.getLayout(bus.seatLayoutId);
    if (!layout) return undefined;
    const occupied = this.occupiedSeatIds(schedule.id);
    const availableSeats = layout.capacity - occupied.size;
    const minFare = Math.min(schedule.fares.standard, schedule.fares.business, schedule.fares.vip);
    return { schedule: clone(schedule), route: clone(route), bus: clone(bus), layout: clone(layout), availableSeats, minFare };
  }

  searchSchedules(params: { origin: string; destination: string; date: string }): EnrichedSchedule[] {
    this.cleanupExpiredHolds();
    const routeIds = this.data.routes
      .filter((r) => isPublicRoute(r) && r.origin === params.origin && r.destination === params.destination)
      .map((r) => r.id);
    return this.data.schedules
      .filter(
        (s) =>
          routeIds.includes(s.routeId) &&
          s.date === params.date &&
          s.status === 'scheduled',
      )
      .map((s) => this.enrich(s))
      .filter((s): s is EnrichedSchedule => Boolean(s))
      .sort((a, b) => a.schedule.departureTime.localeCompare(b.schedule.departureTime));
  }

  getScheduleView(scheduleId: string): EnrichedSchedule | undefined {
    this.cleanupExpiredHolds();
    const sch = this.data.schedules.find((s) => s.id === scheduleId);
    if (!sch) return undefined;
    return this.enrich(sch);
  }

  listSchedules(): Schedule[] {
    return clone(this.data.schedules);
  }

  /** Seats that cannot be selected right now: booked, maintenance-blocked, or held. */
  private occupiedSeatIds(scheduleId: string): Set<string> {
    const sch = this.data.schedules.find((s) => s.id === scheduleId);
    const occupied = new Set<string>();
    if (!sch) return occupied;
    for (const id of sch.bookedSeatIds) occupied.add(id);
    const bus = this.getBus(sch.busId);
    if (bus) for (const id of bus.blockedSeatIds) occupied.add(id);
    const now = Date.now();
    for (const h of this.holds.values()) {
      if (h.scheduleId === scheduleId && h.status === 'active' && new Date(h.expiresAt).getTime() > now) {
        for (const id of h.seatIds) occupied.add(id);
      }
    }
    return occupied;
  }

  /** Map of seatId -> status for rendering the seat map (excludes the caller's own hold). */
  seatStatuses(scheduleId: string, ownHoldId?: string): Record<string, SeatStatus> {
    this.cleanupExpiredHolds();
    const sch = this.data.schedules.find((s) => s.id === scheduleId);
    const out: Record<string, SeatStatus> = {};
    if (!sch) return out;
    const bus = this.getBus(sch.busId);
    const blocked = new Set(bus?.blockedSeatIds ?? []);
    const booked = new Set(sch.bookedSeatIds);
    const now = Date.now();
    const heldByOthers = new Set<string>();
    for (const h of this.holds.values()) {
      if (
        h.scheduleId === scheduleId &&
        h.status === 'active' &&
        h.id !== ownHoldId &&
        new Date(h.expiresAt).getTime() > now
      ) {
        for (const id of h.seatIds) heldByOthers.add(id);
      }
    }
    const layout = bus ? this.getLayout(bus.seatLayoutId) : undefined;
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
  /* Seat holds                                                        */
  /* ------------------------------------------------------------------ */

  private cleanupExpiredHolds() {
    const now = Date.now();
    for (const h of this.holds.values()) {
      if (h.status === 'active' && new Date(h.expiresAt).getTime() <= now) {
        h.status = 'released';
      }
    }
  }

  /**
   * Atomically hold seats for a session. Re-checks availability against booked,
   * blocked and other active holds before committing — this is what prevents
   * double-booking. A session's previous active hold for the same schedule is
   * replaced (so re-selecting seats is idempotent).
   */
  holdSeats(params: { scheduleId: string; seatIds: string[]; sessionId: string }): HoldResult {
    this.cleanupExpiredHolds();
    const sch = this.data.schedules.find((s) => s.id === params.scheduleId);
    if (!sch) return { ok: false, conflictSeats: [] };

    const bus = this.getBus(sch.busId);
    const blocked = new Set(bus?.blockedSeatIds ?? []);
    const booked = new Set(sch.bookedSeatIds);
    const now = Date.now();

    // Seats held by OTHER sessions are off-limits.
    const heldByOthers = new Set<string>();
    for (const h of this.holds.values()) {
      if (
        h.scheduleId === params.scheduleId &&
        h.status === 'active' &&
        h.sessionId !== params.sessionId &&
        new Date(h.expiresAt).getTime() > now
      ) {
        for (const id of h.seatIds) heldByOthers.add(id);
      }
    }

    const conflicts = params.seatIds.filter(
      (id) => booked.has(id) || blocked.has(id) || heldByOthers.has(id),
    );
    if (conflicts.length > 0) return { ok: false, conflictSeats: conflicts };

    // Release this session's prior active holds for this schedule.
    for (const h of this.holds.values()) {
      if (h.scheduleId === params.scheduleId && h.sessionId === params.sessionId && h.status === 'active') {
        h.status = 'released';
      }
    }

    const ttl = this.data.settings.seatHoldTtlSeconds || SEAT_HOLD_TTL_SECONDS;
    const hold: SeatHold = {
      id: generateId('hold'),
      scheduleId: params.scheduleId,
      seatIds: [...params.seatIds],
      sessionId: params.sessionId,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(now + ttl * 1000).toISOString(),
    };
    this.holds.set(hold.id, hold);
    return { ok: true, hold: clone(hold) };
  }

  getHold(holdId: string): SeatHold | undefined {
    this.cleanupExpiredHolds();
    const h = this.holds.get(holdId);
    return h ? clone(h) : undefined;
  }

  releaseHold(holdId: string) {
    const h = this.holds.get(holdId);
    if (h && h.status === 'active') h.status = 'released';
  }

  /* ------------------------------------------------------------------ */
  /* Bookings                                                          */
  /* ------------------------------------------------------------------ */

  private event(type: BookingEvent['type'], message: string, actor = 'system'): BookingEvent {
    return { id: generateId('evt'), type, message, at: new Date().toISOString(), actor };
  }

  createBooking(params: {
    scheduleId: string;
    seatIds: string[];
    seatCategory: SeatCategory;
    passenger: PassengerDetails;
    holdId: string;
    sessionId: string;
    promoCode?: string;
    customerId?: string;
  }): { ok: boolean; booking?: Booking; error?: string } {
    // Idempotency: a given hold yields at most one booking.
    const existingId = this.holdToBooking.get(params.holdId);
    if (existingId) {
      const existing = this.bookings.get(existingId);
      if (existing) return { ok: true, booking: clone(existing) };
    }

    const hold = this.holds.get(params.holdId);
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

    const view = this.getScheduleView(params.scheduleId);
    if (!view) return { ok: false, error: 'Trip no longer available.' };

    const promo = params.promoCode ? this.getPromotionByCode(params.promoCode) : undefined;
    const breakdown = calculateFare({
      fares: view.schedule.fares,
      category: params.seatCategory,
      seatCount: params.seatIds.length,
      serviceFeePerSeat: view.schedule.serviceFee,
      promotion: promo,
      routeId: view.route.id,
      now: new Date(),
    });

    const now = new Date().toISOString();
    const booking: Booking = {
      id: generateId('bk'),
      reference: generateReference(),
      ticketNumber: '',
      scheduleId: view.schedule.id,
      routeId: view.route.id,
      busId: view.bus.id,
      seatIds: [...params.seatIds],
      seatCategory: params.seatCategory,
      fareCategory: params.seatCategory,
      passenger: clone(params.passenger),
      customerId: params.customerId,
      origin: view.route.origin,
      destination: view.route.destination,
      boardingPoint: `${view.route.origin} Terminal`,
      travelDate: view.schedule.date,
      departureTime: view.schedule.departureTime,
      arrivalTime: view.schedule.arrivalTime,
      busNumber: view.bus.busNumber,
      busCategory: view.bus.category,
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
    this.bookings.set(booking.id, booking);
    this.holdToBooking.set(hold.id, booking.id);
    return { ok: true, booking: clone(booking) };
  }

  getBookingByReference(reference: string): Booking | undefined {
    const b = [...this.bookings.values()].find(
      (x) => x.reference.toLowerCase() === reference.trim().toLowerCase(),
    );
    return b ? clone(b) : undefined;
  }

  /** Guest lookup: reference + matching email OR phone (case/space-insensitive). */
  lookupBooking(reference: string, contact: string): Booking | undefined {
    const b = [...this.bookings.values()].find(
      (x) => x.reference.toLowerCase() === reference.trim().toLowerCase(),
    );
    if (!b) return undefined;
    const c = contact.trim().toLowerCase().replace(/\s+/g, '');
    const email = b.passenger.email.toLowerCase();
    const phone = b.passenger.phone.toLowerCase().replace(/\s+/g, '');
    if (c === email || c === phone) return clone(b);
    return undefined;
  }

  listBookings(filter?: { status?: Booking['status']; customerId?: string }): Booking[] {
    let list = [...this.bookings.values()];
    if (filter?.status) list = list.filter((b) => b.status === filter.status);
    if (filter?.customerId) list = list.filter((b) => b.customerId === filter.customerId);
    return clone(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  /* ------------------------------------------------------------------ */
  /* Payments                                                          */
  /* ------------------------------------------------------------------ */

  recordPaymentInit(params: {
    bookingReference: string;
    provider: string;
    method: PaymentMethod;
    providerReference: string;
  }): { ok: boolean; payment?: Payment; error?: string } {
    const booking = [...this.bookings.values()].find(
      (b) => b.reference.toLowerCase() === params.bookingReference.toLowerCase(),
    );
    if (!booking) return { ok: false, error: 'Booking not found.' };

    // Idempotent: reuse an existing non-terminal payment for this booking.
    let payment = [...this.payments.values()].find(
      (p) => p.bookingId === booking.id && ['initiated', 'pending'].includes(p.status),
    );
    const now = new Date().toISOString();
    if (!payment) {
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
      this.payments.set(payment.id, payment);
    } else {
      payment.providerReference = params.providerReference;
      payment.reference = params.providerReference;
      payment.method = params.method;
      payment.updatedAt = now;
    }
    booking.paymentId = payment.id;
    booking.paymentStatus = 'pending';
    booking.status = 'payment_processing';
    booking.history.push(this.event('payment_initiated', `Payment initiated via ${params.method}.`, 'customer'));
    booking.updatedAt = now;
    return { ok: true, payment: clone(payment) };
  }

  /**
   * Confirm a booking after server-side verified payment. Idempotent: if the
   * booking is already confirmed it returns the existing record. Re-checks seat
   * availability and converts the hold into permanent reservations.
   */
  confirmPayment(params: {
    providerReference: string;
    bookingReference?: string;
  }): { ok: boolean; booking?: Booking; error?: string } {
    let payment = [...this.payments.values()].find(
      (p) => p.providerReference === params.providerReference,
    );
    let booking: Booking | undefined;
    if (payment) booking = this.bookings.get(payment.bookingId);
    if (!booking && params.bookingReference) {
      booking = [...this.bookings.values()].find(
        (b) => b.reference.toLowerCase() === params.bookingReference!.toLowerCase(),
      );
      if (booking && !payment) payment = this.payments.get(booking.paymentId ?? '');
    }
    if (!booking) return { ok: false, error: 'Booking not found for this reference.' };

    if (booking.status === 'confirmed' || booking.paymentStatus === 'successful') {
      return { ok: true, booking: clone(booking) }; // idempotent
    }

    const sch = this.data.schedules.find((s) => s.id === booking!.scheduleId);
    if (!sch) return { ok: false, error: 'Trip no longer available.' };

    // Defensive re-check: ensure the seats were not taken since the hold.
    const booked = new Set(sch.bookedSeatIds);
    const taken = booking.seatIds.filter((s) => booked.has(s));
    if (taken.length > 0) {
      booking.status = 'payment_failed';
      booking.paymentStatus = 'failed';
      booking.history.push(this.event('payment_failed', `Seats ${taken.join(', ')} were taken. Payment must be reversed.`, 'system'));
      booking.updatedAt = new Date().toISOString();
      return { ok: false, error: 'Selected seats are no longer available.' };
    }

    // Convert hold -> permanent booked seats.
    sch.bookedSeatIds = [...new Set([...sch.bookedSeatIds, ...booking.seatIds])];
    if (booking.holdId) {
      const hold = this.holds.get(booking.holdId);
      if (hold) hold.status = 'converted';
    }

    const now = new Date().toISOString();
    if (payment) {
      payment.status = 'successful';
      payment.verifiedAt = now;
      payment.updatedAt = now;
    }
    booking.ticketNumber = booking.ticketNumber || generateTicketNumber();
    booking.status = 'confirmed';
    booking.paymentStatus = 'successful';
    booking.history.push(this.event('payment_succeeded', 'Payment verified on the server.', 'system'));
    booking.history.push(this.event('confirmed', 'Booking confirmed. E-ticket issued.', 'system'));
    booking.updatedAt = now;
    return { ok: true, booking: clone(booking) };
  }

  failPayment(bookingReference: string, reason: string) {
    const booking = [...this.bookings.values()].find(
      (b) => b.reference.toLowerCase() === bookingReference.toLowerCase(),
    );
    if (!booking) return;
    booking.paymentStatus = 'failed';
    booking.status = 'payment_failed';
    booking.history.push(this.event('payment_failed', reason, 'system'));
    booking.updatedAt = new Date().toISOString();
    if (booking.paymentId) {
      const p = this.payments.get(booking.paymentId);
      if (p) {
        p.status = 'failed';
        p.updatedAt = new Date().toISOString();
      }
    }
  }

  listPayments(): Payment[] {
    return clone([...this.payments.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  /* ------------------------------------------------------------------ */
  /* Cancellation / rescheduling                                       */
  /* ------------------------------------------------------------------ */

  cancelBooking(reference: string, actor = 'customer'): { ok: boolean; booking?: Booking; error?: string; refund?: ReturnType<typeof computeRefund> } {
    const booking = [...this.bookings.values()].find(
      (b) => b.reference.toLowerCase() === reference.toLowerCase(),
    );
    if (!booking) return { ok: false, error: 'Booking not found.' };
    const sch = this.data.schedules.find((s) => s.id === booking.scheduleId);
    if (!sch) return { ok: false, error: 'Trip not found.' };

    const eligibility = canCancel(booking, sch, this.data.settings, new Date());
    if (!eligibility.allowed) return { ok: false, error: eligibility.reason };

    const refund = computeRefund(booking, this.data.settings);
    // Free the seats (do NOT delete the original booking record).
    sch.bookedSeatIds = sch.bookedSeatIds.filter((s) => !booking.seatIds.includes(s));
    const now = new Date().toISOString();
    booking.status = 'cancelled';
    booking.paymentStatus = refund.refundable ? 'refunded' : booking.paymentStatus;
    booking.history.push(this.event('cancel_requested', 'Cancellation requested.', actor));
    booking.history.push(this.event('cancelled', `Booking cancelled. Refund: ${CURRENCY.symbol}${refund.refundAmount.toFixed(2)}.`, 'system'));
    booking.updatedAt = now;
    return { ok: true, booking: clone(booking), refund };
  }

  rescheduleBooking(reference: string, newScheduleId: string, newSeatIds: string[], actor = 'customer'): { ok: boolean; booking?: Booking; error?: string } {
    const booking = [...this.bookings.values()].find(
      (b) => b.reference.toLowerCase() === reference.toLowerCase(),
    );
    if (!booking) return { ok: false, error: 'Booking not found.' };
    const currentSch = this.data.schedules.find((s) => s.id === booking.scheduleId);
    if (!currentSch) return { ok: false, error: 'Current trip not found.' };

    const eligibility = canReschedule(booking, currentSch, this.data.settings, new Date());
    if (!eligibility.allowed) return { ok: false, error: eligibility.reason };

    const newView = this.getScheduleView(newScheduleId);
    if (!newView) return { ok: false, error: 'New trip not available.' };

    const occupied = this.occupiedSeatIds(newScheduleId);
    const conflicts = newSeatIds.filter((s) => occupied.has(s));
    if (conflicts.length > 0) return { ok: false, error: `Seats ${conflicts.join(', ')} not available on the new trip.` };

    // Free old seats, reserve new ones. Keep the same booking record.
    currentSch.bookedSeatIds = currentSch.bookedSeatIds.filter((s) => !booking.seatIds.includes(s));
    const newSch = this.data.schedules.find((s) => s.id === newScheduleId)!;
    newSch.bookedSeatIds = [...new Set([...newSch.bookedSeatIds, ...newSeatIds])];

    const now = new Date().toISOString();
    booking.history.push(this.event('reschedule_requested', `Reschedule to ${newView.route.origin} → ${newView.route.destination} on ${newView.schedule.date}.`, actor));
    booking.scheduleId = newScheduleId;
    booking.routeId = newView.route.id;
    booking.busId = newView.bus.id;
    booking.seatIds = [...newSeatIds];
    booking.origin = newView.route.origin;
    booking.destination = newView.route.destination;
    booking.travelDate = newView.schedule.date;
    booking.departureTime = newView.schedule.departureTime;
    booking.arrivalTime = newView.schedule.arrivalTime;
    booking.busNumber = newView.bus.busNumber;
    booking.busCategory = newView.bus.category;
    booking.rescheduleCount += 1;
    booking.status = 'confirmed';
    booking.history.push(this.event('rescheduled', 'Booking rescheduled.', 'system'));
    booking.updatedAt = now;
    return { ok: true, booking: clone(booking) };
  }

  cancellationQuote(reference: string) {
    const booking = [...this.bookings.values()].find(
      (b) => b.reference.toLowerCase() === reference.toLowerCase(),
    );
    if (!booking) return undefined;
    const sch = this.data.schedules.find((s) => s.id === booking.scheduleId);
    if (!sch) return undefined;
    return {
      eligibility: canCancel(booking, sch, this.data.settings, new Date()),
      reschedule: canReschedule(booking, sch, this.data.settings, new Date()),
      refund: computeRefund(booking, this.data.settings),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Ticket verification (staff)                                       */
  /* ------------------------------------------------------------------ */

  verifyTicket(reference: string) {
    const b = this.getBookingByReference(reference);
    if (!b) return { found: false as const };
    const valid = b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'completed';
    return {
      found: true as const,
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

  checkIn(reference: string): { ok: boolean; error?: string } {
    const booking = [...this.bookings.values()].find(
      (b) => b.reference.toLowerCase() === reference.toLowerCase(),
    );
    if (!booking) return { ok: false, error: 'Booking not found.' };
    if (booking.status !== 'confirmed') return { ok: false, error: `Cannot check in a "${booking.status}" booking.` };
    booking.status = 'checked_in';
    booking.history.push(this.event('note', 'Passenger checked in at terminal.', 'staff'));
    booking.updatedAt = new Date().toISOString();
    return { ok: true };
  }

  /* ------------------------------------------------------------------ */
  /* Support messages + audit                                          */
  /* ------------------------------------------------------------------ */

  addSupportMessage(msg: Omit<SupportMessage, 'id' | 'status' | 'createdAt' | 'updatedAt'>): SupportMessage {
    const now = new Date().toISOString();
    const record: SupportMessage = { ...msg, id: generateId('msg'), status: 'new', createdAt: now, updatedAt: now };
    this.supportMessages.set(record.id, record);
    return clone(record);
  }

  listSupportMessages(): SupportMessage[] {
    return clone([...this.supportMessages.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  addAudit(entry: Omit<AuditLog, 'id' | 'at'>) {
    this.auditLogs.unshift({ ...entry, id: generateId('aud'), at: new Date().toISOString() });
  }

  listAuditLogs(): AuditLog[] {
    return clone(this.auditLogs);
  }

  /* ------------------------------------------------------------------ */
  /* Admin overview + reports                                          */
  /* ------------------------------------------------------------------ */

  overview() {
    const bookings = [...this.bookings.values()];
    const today = new Date().toISOString().slice(0, 10);
    const confirmed = bookings.filter((b) => ['confirmed', 'checked_in', 'completed'].includes(b.status));
    const revenue = confirmed.reduce((sum, b) => sum + b.total, 0);
    const upcoming = this.data.schedules.filter((s) => s.date >= today && s.status === 'scheduled');
    return {
      totalBookings: bookings.length,
      todaysBookings: bookings.filter((b) => b.createdAt.slice(0, 10) === today).length,
      upcomingDepartures: upcoming.length,
      revenue,
      pendingPayments: bookings.filter((b) => ['pending_payment', 'payment_processing'].includes(b.status)).length,
      cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
      activeBuses: this.data.buses.filter((b) => b.status === 'active').length,
      seatOccupancyRate: this.seatOccupancyRate(),
      routesNeedingAttention: this.data.schedules.filter((s) => s.status === 'paused' || s.status === 'cancelled').length,
    };
  }

  private seatOccupancyRate(): number {
    const upcoming = this.data.schedules.filter((s) => s.status === 'scheduled');
    if (upcoming.length === 0) return 0;
    let cap = 0;
    let occ = 0;
    for (const s of upcoming) {
      const bus = this.getBus(s.busId);
      const layout = bus ? this.getLayout(bus.seatLayoutId) : undefined;
      if (!layout) continue;
      cap += layout.capacity;
      occ += this.occupiedSeatIds(s.id).size;
    }
    return cap === 0 ? 0 : Math.round((occ / cap) * 100);
  }

  reports() {
    const confirmed = [...this.bookings.values()].filter((b) =>
      ['confirmed', 'checked_in', 'completed'].includes(b.status),
    );
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
    for (const p of this.payments.values()) {
      if (p.status === 'successful') byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + 1);
    }

    return {
      revenueByRoute: [...byRoute.values()].sort((a, b) => b.revenue - a.revenue),
      revenueByBus: [...byBus.values()].sort((a, b) => b.revenue - a.revenue),
      revenueByDate: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
      paymentMethods: [...byMethod.entries()].map(([method, count]) => ({ method, count })),
      popularRoutes: [...byRoute.values()].sort((a, b) => b.bookings - a.bookings).slice(0, 5),
      cancellations: [...this.bookings.values()].filter((b) => b.status === 'cancelled').length,
      refunds: [...this.bookings.values()].filter((b) => ['refunded', 'partially_refunded'].includes(b.paymentStatus)).length,
      totalRevenue: confirmed.reduce((s, b) => s + b.total, 0),
      occupancyRate: this.seatOccupancyRate(),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Sample bookings (for dashboards / reports demonstration)          */
  /* ------------------------------------------------------------------ */

  private seedSampleBookings() {
    const upcoming = this.data.schedules.filter((s) => s.status === 'scheduled');
    if (upcoming.length < 3) return;
    const mk = (
      sch: Schedule,
      seatIds: string[],
      category: SeatCategory,
      passenger: PassengerDetails,
      status: Booking['status'],
      method: PaymentMethod,
      customerId?: string,
    ) => {
      const view = this.enrich(sch)!;
      const breakdown = calculateFare({
        fares: sch.fares,
        category,
        seatCount: seatIds.length,
        serviceFeePerSeat: sch.serviceFee,
        routeId: view.route.id,
        now: new Date(),
      });
      const now = new Date().toISOString();
      const paid = status === 'confirmed';
      const booking: Booking = {
        id: generateId('bk'),
        reference: generateReference(),
        ticketNumber: paid ? generateTicketNumber() : '',
        scheduleId: sch.id,
        routeId: view.route.id,
        busId: view.bus.id,
        seatIds,
        seatCategory: category,
        fareCategory: category,
        passenger,
        customerId,
        origin: view.route.origin,
        destination: view.route.destination,
        boardingPoint: `${view.route.origin} Terminal`,
        travelDate: sch.date,
        departureTime: sch.departureTime,
        arrivalTime: sch.arrivalTime,
        busNumber: view.bus.busNumber,
        busCategory: view.bus.category,
        baseFare: breakdown.baseFare,
        fees: breakdown.fees,
        discount: breakdown.discount,
        total: breakdown.total,
        currency: CURRENCY.code,
        status,
        paymentStatus: paid ? 'successful' : 'initiated',
        rescheduleCount: 0,
        promoCode: undefined,
        history: [this.event('created', 'Sample booking (demo data).', 'system')],
        createdAt: now,
        updatedAt: now,
      };
      if (paid) {
        sch.bookedSeatIds = [...new Set([...sch.bookedSeatIds, ...seatIds])];
        const payment: Payment = {
          id: generateId('pay'),
          bookingId: booking.id,
          reference: `DEMOPAY-${booking.reference}`,
          provider: 'mock',
          method,
          amount: booking.total,
          currency: booking.currency,
          status: 'successful',
          providerReference: `DEMOPAY-${booking.reference}`,
          idempotencyKey: booking.id,
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        this.payments.set(payment.id, payment);
        booking.paymentId = payment.id;
      }
      this.bookings.set(booking.id, booking);
    };

    mk(
      upcoming[0]!,
      ['2A', '2B'],
      'business',
      { fullName: 'Ama Mensah', phone: '+233241234567', email: 'ama@example.com', idType: 'ghana_card', idNumber: 'GHA-000000000-0' },
      'confirmed',
      'mobile_money',
      'user_ama',
    );
    mk(
      upcoming[1]!,
      ['6C'],
      'standard',
      { fullName: 'Kofi Boateng', phone: '+233201112233', email: 'kofi@example.com', idType: 'student_id', idNumber: 'UCC/2026/001' },
      'confirmed',
      'card',
      'user_kofi',
    );
    mk(
      upcoming[2]!,
      ['8A'],
      'standard',
      { fullName: 'Yaa Asantewaa', phone: '+233551234567', email: 'yaa@example.com', idType: 'ghana_card' },
      'pending_payment',
      'mobile_money',
    );
  }
}

const g = globalThis as unknown as { __smgStore?: MockStore };

/** Singleton accessor — survives Next.js HMR in development. */
export function getStore(): MockStore {
  if (!g.__smgStore) g.__smgStore = new MockStore();
  return g.__smgStore;
}

/** Create a fresh, isolated store instance (used by unit tests). */
export function createStore(): MockStore {
  return new MockStore();
}

export type { MockStore };
