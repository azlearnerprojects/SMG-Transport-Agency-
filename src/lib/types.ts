/**
 * Domain types for SMG Transport Agency.
 * These mirror the Firestore collections documented in DATABASE_SCHEMA.md and are
 * the single source of truth shared by the mock layer, the (future) Firebase
 * adapter, server APIs, and the UI.
 */

export type SeatCategory = 'standard' | 'business' | 'vip';
export type BusCategory = 'standard' | 'business' | 'vip';

export type BusStatus = 'active' | 'maintenance' | 'archived';

export type ScheduleStatus =
  | 'scheduled'
  | 'paused'
  | 'cancelled'
  | 'departed'
  | 'completed';

export type BookingStatus =
  | 'draft'
  | 'seat_held'
  | 'pending_payment'
  | 'payment_processing'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancel_requested'
  | 'cancelled'
  | 'reschedule_requested'
  | 'rescheduled'
  | 'expired'
  | 'payment_failed'
  | 'refunded'
  | 'partially_refunded';

export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'successful'
  | 'failed'
  | 'abandoned'
  | 'reversed'
  | 'refunded'
  | 'partially_refunded';

export type PaymentMethod =
  | 'mobile_money'
  | 'card'
  | 'bank_transfer';

export type AuthRole =
  | 'super_admin'
  | 'admin'
  | 'staff'
  | 'support_agent'
  | 'customer'
  | 'staff_pending';

export type AccountStatus = 'active' | 'pending' | 'disabled';

export type StaffRole =
  | 'super_admin'
  | 'admin'
  | 'staff'
  | 'support_agent'
  | 'operations_manager'
  | 'booking_officer'
  | 'customer_support'
  | 'finance_officer'
  | 'content_editor'
  | 'ticket_inspector';

export type IdType = 'ghana_card' | 'national_id' | 'passport' | 'student_id' | 'none';

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

/** A single cell within a seat layout grid. */
export interface SeatCell {
  /** Unique seat id within the layout, e.g. "1A". Empty for non-seat cells. */
  id: string;
  row: number;
  col: number;
  kind: 'seat' | 'aisle' | 'driver' | 'door' | 'blocked';
  category: SeatCategory;
}

export interface SeatLayout extends Timestamps {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: SeatCell[];
  capacity: number;
}

export interface Bus extends Timestamps {
  id: string;
  busNumber: string;
  name: string;
  category: BusCategory;
  seatLayoutId: string;
  capacity: number;
  amenities: string[];
  status: BusStatus;
  /** Seat ids manually marked out of service (maintenance). */
  blockedSeatIds: string[];
}

export interface BoardingPoint extends Timestamps {
  id: string;
  city: string;
  name: string;
  address: string;
}

export interface Route extends Timestamps {
  id: string;
  code: string;
  origin: string;
  destination: string;
  originBoardingPointId: string;
  destinationBoardingPointId: string;
  distanceKm: number;
  durationMinutes: number;
  description: string;
  popular: boolean;
}

/** Base fares per seat category for a given departure. */
export type FareTable = Record<SeatCategory, number>;

export interface Schedule extends Timestamps {
  id: string;
  routeId: string;
  busId: string;
  /** Travel date as YYYY-MM-DD (local Ghana time). */
  date: string;
  departureTime: string; // HH:mm
  arrivalTime: string; // HH:mm
  status: ScheduleStatus;
  fares: FareTable;
  /** Flat service fee applied per ticket. */
  serviceFee: number;
  promotionId?: string;
  /** Seat ids confirmed-booked. Derived availability = capacity - booked - active holds. */
  bookedSeatIds: string[];
}

export interface Promotion extends Timestamps {
  id: string;
  code: string;
  title: string;
  description: string;
  type: 'percent' | 'flat';
  value: number;
  active: boolean;
  startsAt: string;
  endsAt: string;
  /** When set, the promo only applies to these routes. */
  routeIds?: string[];
}

export interface PassengerDetails {
  fullName: string;
  phone: string;
  email: string;
  idType: IdType;
  idNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  specialAssistance?: string;
}

export interface SeatHold {
  id: string;
  scheduleId: string;
  seatIds: string[];
  sessionId: string;
  status: 'active' | 'released' | 'converted';
  createdAt: string;
  expiresAt: string;
}

export interface BookingEvent {
  id: string;
  type:
    | 'created'
    | 'seat_held'
    | 'payment_initiated'
    | 'payment_succeeded'
    | 'payment_failed'
    | 'confirmed'
    | 'cancel_requested'
    | 'cancelled'
    | 'reschedule_requested'
    | 'rescheduled'
    | 'refunded'
    | 'expired'
    | 'note';
  message: string;
  at: string;
  actor: string; // "customer" | "system" | staff email
}

export interface Booking extends Timestamps {
  id: string;
  reference: string;
  ticketNumber: string;
  scheduleId: string;
  routeId: string;
  busId: string;
  seatIds: string[];
  seatCategory: SeatCategory;
  fareCategory: string;
  passenger: PassengerDetails;
  customerId?: string;
  // Denormalised trip facts for tickets / dashboards.
  origin: string;
  destination: string;
  boardingPoint: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  busNumber: string;
  busCategory: BusCategory;
  // Money (all in GHS, two-decimal numbers).
  baseFare: number;
  fees: number;
  discount: number;
  total: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  holdId?: string;
  promoCode?: string;
  rescheduleCount: number;
  history: BookingEvent[];
}

export interface Payment extends Timestamps {
  id: string;
  bookingId: string;
  reference: string;
  provider: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerReference?: string;
  idempotencyKey: string;
  verifiedAt?: string;
}

export interface FaqItem extends Timestamps {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  published: boolean;
}

export interface Announcement extends Timestamps {
  id: string;
  title: string;
  body: string;
  level: 'info' | 'success' | 'warning';
  active: boolean;
  publishedAt: string;
}

export interface ContentPage extends Timestamps {
  id: string;
  slug: string;
  title: string;
  /** Plain/markdown-ish body; sanitised before render. */
  body: string;
  published: boolean;
}

export interface SupportMessage extends Timestamps {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
}

export interface AppUser extends Timestamps {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  emailVerified: boolean;
  savedPassengers: PassengerDetails[];
}

export interface UserProfile extends Timestamps {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phone?: string;
  role: AuthRole;
  status: AccountStatus;
  lastLoginAt: string;
}

export interface StaffProfile extends Timestamps {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  active: boolean;
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export interface RoleAuditLog {
  id?: string;
  action: string;
  performedByUid?: string | null;
  performedByEmail: string;
  targetUid: string;
  targetEmail: string;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
}

export interface SystemSettings {
  cancellationCutoffHours: number;
  reschedulingCutoffHours: number;
  cancellationFeePercent: number;
  maxReschedules: number;
  refundProcessingDays: number;
  nonRefundableFareCategories: string[];
  seatHoldTtlSeconds: number;
}

export type PaymentGatewayMode = 'test' | 'live';
export type ChatbotTone = 'friendly' | 'professional' | 'concise' | 'playful';

export interface PublicSiteConfig {
  siteName: string;
  tagline: string;
  supportPhone: string;
  supportWhatsapp: string;
  supportEmail: string;
  supportHours: string;
  companyAddress: string;
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  socialTiktok: string;
  bookingEnabled: boolean;
  maintenanceMode: boolean;
  bookingOpeningEnabled: boolean;
  cancellationWindowHours: number;
  reschedulingWindowHours: number;
  defaultCurrency: string;
  defaultTimezone: string;
  serviceFee: number;
  taxPercentage: number;
  featuredRoutes: string[];
  announcementBannerEnabled: boolean;
  announcementBannerText: string;
  emergencyTravelNotice: string;
  paymentGatewayMode: PaymentGatewayMode;
  paystackPublicKey: string;
  smsProviderEnabled: boolean;
  emailProviderEnabled: boolean;
  chatbotEnabled: boolean;
  chatbotEscalationContact: string;
  chatbotResponseTone: ChatbotTone;
  chatbotWelcomeMessage: string;
  updatedAt: string;
}

export interface ChatbotRuntimeConfig {
  enabled: boolean;
  modelName: string;
  temperature: number;
  maxOutputTokens: number;
  systemPromptVersion: string;
  welcomeMessage: string;
  escalationEnabled: boolean;
  escalationWhatsapp: string;
  responseTone: ChatbotTone;
  updatedAt: string;
}

export interface ChatSession extends Timestamps {
  id: string;
  uid?: string;
  anonymousId?: string;
  status: 'open' | 'resolved' | 'escalated' | 'errored';
  resolvedBy?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface PolicyItem extends Timestamps {
  id: string;
  title: string;
  body: string;
  category: string;
  active: boolean;
}
