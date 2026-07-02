import { DEMO_MODE } from '@/lib/config';
import {
  getStore,
  type EnrichedSchedule,
  type HoldResult,
  type MockStore,
  type SeatStatus,
} from '@/lib/data/store';
import { getFirestoreStore } from './firestore-store';
import type { RefundQuote, EligibilityResult } from '@/lib/booking-rules';
import type {
  Announcement,
  AuditLog,
  AppUser,
  Booking,
  BookingStatus,
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

export type { EnrichedSchedule, HoldResult, SeatStatus };

export type TicketVerification =
  | { found: false }
  | {
      found: true;
      valid: boolean;
      reference: string;
      ticketNumber: string;
      passenger: string;
      route: string;
      travelDate: string;
      departureTime: string;
      seats: string[];
      busNumber: string;
      status: BookingStatus;
    };

export interface AdminOverview {
  totalBookings: number;
  todaysBookings: number;
  upcomingDepartures: number;
  revenue: number;
  pendingPayments: number;
  cancelledBookings: number;
  activeBuses: number;
  seatOccupancyRate: number;
  routesNeedingAttention: number;
}

export interface AdminReports {
  revenueByRoute: { route: string; bookings: number; revenue: number }[];
  revenueByBus: { bus: string; bookings: number; revenue: number }[];
  revenueByDate: { date: string; bookings: number; revenue: number }[];
  paymentMethods: { method: string; count: number }[];
  popularRoutes: { route: string; bookings: number; revenue: number }[];
  cancellations: number;
  refunds: number;
  totalRevenue: number;
  occupancyRate: number;
}

export interface CancellationQuote {
  eligibility: EligibilityResult;
  reschedule: EligibilityResult;
  refund: RefundQuote;
}

/**
 * Async database contract shared by the demo (in-memory) adapter and the
 * production Firestore adapter. Every consumer goes through `getDb()` and
 * `await`s each call, so swapping the backing store never touches call sites.
 */
export interface Database {
  /* Settings */
  getSettings(): Promise<SystemSettings>;
  updateSettings(patch: Partial<SystemSettings>): Promise<SystemSettings>;

  /* Reference data */
  listRoutes(): Promise<Route[]>;
  listBuses(): Promise<Bus[]>;
  listLayouts(): Promise<SeatLayout[]>;
  listPromotions(): Promise<Promotion[]>;
  listFaqs(): Promise<FaqItem[]>;
  listAllFaqs(): Promise<FaqItem[]>;
  listAnnouncements(): Promise<Announcement[]>;
  listContentPages(): Promise<ContentPage[]>;
  getContentPage(slug: string): Promise<ContentPage | undefined>;
  listStaff(): Promise<StaffProfile[]>;
  listCustomers(): Promise<AppUser[]>;
  getCities(): Promise<string[]>;
  getRoute(id: string): Promise<Route | undefined>;
  getBus(id: string): Promise<Bus | undefined>;
  getLayout(id: string): Promise<SeatLayout | undefined>;
  getPromotionByCode(code: string): Promise<Promotion | undefined>;

  /* Schedules + availability */
  searchSchedules(params: { origin: string; destination: string; date: string }): Promise<EnrichedSchedule[]>;
  getScheduleView(scheduleId: string): Promise<EnrichedSchedule | undefined>;
  listSchedules(): Promise<Schedule[]>;
  seatStatuses(scheduleId: string, ownHoldId?: string): Promise<Record<string, SeatStatus>>;

  /* Seat holds */
  holdSeats(params: { scheduleId: string; seatIds: string[]; sessionId: string }): Promise<HoldResult>;
  getHold(holdId: string): Promise<SeatHold | undefined>;
  releaseHold(holdId: string): Promise<void>;

  /* Bookings */
  createBooking(params: {
    scheduleId: string;
    seatIds: string[];
    seatCategory: SeatCategory;
    passenger: PassengerDetails;
    holdId: string;
    sessionId: string;
    promoCode?: string;
    customerId?: string;
  }): Promise<{ ok: boolean; booking?: Booking; error?: string }>;
  getBookingByReference(reference: string): Promise<Booking | undefined>;
  lookupBooking(reference: string, contact: string): Promise<Booking | undefined>;
  listBookings(filter?: { status?: Booking['status']; customerId?: string }): Promise<Booking[]>;

  /* Payments */
  recordPaymentInit(params: {
    bookingReference: string;
    provider: string;
    method: PaymentMethod;
    providerReference: string;
  }): Promise<{ ok: boolean; payment?: Payment; error?: string }>;
  confirmPayment(params: {
    providerReference: string;
    bookingReference?: string;
  }): Promise<{ ok: boolean; booking?: Booking; error?: string }>;
  failPayment(bookingReference: string, reason: string): Promise<void>;
  listPayments(): Promise<Payment[]>;

  /* Cancellation / rescheduling */
  cancelBooking(reference: string, actor?: string): Promise<{ ok: boolean; booking?: Booking; error?: string; refund?: RefundQuote }>;
  rescheduleBooking(reference: string, newScheduleId: string, newSeatIds: string[], actor?: string): Promise<{ ok: boolean; booking?: Booking; error?: string }>;
  cancellationQuote(reference: string): Promise<CancellationQuote | undefined>;

  /* Ticket verification (staff) */
  verifyTicket(reference: string): Promise<TicketVerification>;
  checkIn(reference: string): Promise<{ ok: boolean; error?: string }>;

  /* Support + audit */
  addSupportMessage(msg: Omit<SupportMessage, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<SupportMessage>;
  listSupportMessages(): Promise<SupportMessage[]>;
  addAudit(entry: Omit<AuditLog, 'id' | 'at'>): Promise<void>;
  listAuditLogs(): Promise<AuditLog[]>;

  /* Admin overview + reports */
  overview(): Promise<AdminOverview>;
  reports(): Promise<AdminReports>;
}

/** Async facade over the synchronous in-memory MockStore (DEMO mode). */
class DemoAdapter implements Database {
  constructor(private store: MockStore) {}

  async getSettings() {
    return this.store.settings;
  }
  async updateSettings(patch: Partial<SystemSettings>) {
    return this.store.updateSettings(patch);
  }
  async listRoutes() {
    return this.store.listRoutes();
  }
  async listBuses() {
    return this.store.listBuses();
  }
  async listLayouts() {
    return this.store.listLayouts();
  }
  async listPromotions() {
    return this.store.listPromotions();
  }
  async listFaqs() {
    return this.store.listFaqs();
  }
  async listAllFaqs() {
    return this.store.listAllFaqs();
  }
  async listAnnouncements() {
    return this.store.listAnnouncements();
  }
  async listContentPages() {
    return this.store.listContentPages();
  }
  async getContentPage(slug: string) {
    return this.store.getContentPage(slug);
  }
  async listStaff() {
    return this.store.listStaff();
  }
  async listCustomers() {
    return this.store.listCustomers();
  }
  async getCities() {
    return this.store.getCities();
  }
  async getRoute(id: string) {
    return this.store.getRoute(id);
  }
  async getBus(id: string) {
    return this.store.getBus(id);
  }
  async getLayout(id: string) {
    return this.store.getLayout(id);
  }
  async getPromotionByCode(code: string) {
    return this.store.getPromotionByCode(code);
  }
  async searchSchedules(params: { origin: string; destination: string; date: string }) {
    return this.store.searchSchedules(params);
  }
  async getScheduleView(scheduleId: string) {
    return this.store.getScheduleView(scheduleId);
  }
  async listSchedules() {
    return this.store.listSchedules();
  }
  async seatStatuses(scheduleId: string, ownHoldId?: string) {
    return this.store.seatStatuses(scheduleId, ownHoldId);
  }
  async holdSeats(params: { scheduleId: string; seatIds: string[]; sessionId: string }) {
    return this.store.holdSeats(params);
  }
  async getHold(holdId: string) {
    return this.store.getHold(holdId);
  }
  async releaseHold(holdId: string) {
    this.store.releaseHold(holdId);
  }
  async createBooking(params: Parameters<MockStore['createBooking']>[0]) {
    return this.store.createBooking(params);
  }
  async getBookingByReference(reference: string) {
    return this.store.getBookingByReference(reference);
  }
  async lookupBooking(reference: string, contact: string) {
    return this.store.lookupBooking(reference, contact);
  }
  async listBookings(filter?: { status?: Booking['status']; customerId?: string }) {
    return this.store.listBookings(filter);
  }
  async recordPaymentInit(params: Parameters<MockStore['recordPaymentInit']>[0]) {
    return this.store.recordPaymentInit(params);
  }
  async confirmPayment(params: { providerReference: string; bookingReference?: string }) {
    return this.store.confirmPayment(params);
  }
  async failPayment(bookingReference: string, reason: string) {
    this.store.failPayment(bookingReference, reason);
  }
  async listPayments() {
    return this.store.listPayments();
  }
  async cancelBooking(reference: string, actor?: string) {
    return this.store.cancelBooking(reference, actor);
  }
  async rescheduleBooking(reference: string, newScheduleId: string, newSeatIds: string[], actor?: string) {
    return this.store.rescheduleBooking(reference, newScheduleId, newSeatIds, actor);
  }
  async cancellationQuote(reference: string) {
    return this.store.cancellationQuote(reference);
  }
  async verifyTicket(reference: string) {
    return this.store.verifyTicket(reference);
  }
  async checkIn(reference: string) {
    return this.store.checkIn(reference);
  }
  async addSupportMessage(msg: Omit<SupportMessage, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    return this.store.addSupportMessage(msg);
  }
  async listSupportMessages() {
    return this.store.listSupportMessages();
  }
  async addAudit(entry: Omit<AuditLog, 'id' | 'at'>) {
    this.store.addAudit(entry);
  }
  async listAuditLogs() {
    return this.store.listAuditLogs();
  }
  async overview() {
    return this.store.overview();
  }
  async reports() {
    return this.store.reports();
  }
}

const g = globalThis as unknown as { __smgDemoAdapter?: DemoAdapter };

/**
 * Database access boundary.
 *
 * DEMO mode returns the in-memory mock store; production returns the
 * Firestore-backed adapter (persistent, transactional). Both implement the
 * same async `Database` contract.
 */
export function getDb(): Database {
  if (DEMO_MODE) {
    g.__smgDemoAdapter ??= new DemoAdapter(getStore());
    return g.__smgDemoAdapter;
  }
  return getFirestoreStore();
}
