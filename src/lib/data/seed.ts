/**
 * Demonstration seed data for SMG Transport Agency.
 *
 * ⚠️ SAMPLE DATA ONLY — routes, schedules, fares, buses and customers below are
 * illustrative and are NOT officially approved SMG routes or prices. They exist
 * to make the platform fully demonstrable in DEMO mode. Replace with CEO-approved
 * data before launch (see CONTENT_REPLACEMENT_CHECKLIST.md).
 */
import type {
  Announcement,
  Bus,
  BoardingPoint,
  ContentPage,
  FaqItem,
  Promotion,
  Route,
  Schedule,
  SeatCell,
  SeatCategory,
  SeatLayout,
  AppUser,
  StaffProfile,
  SystemSettings,
} from '../types';
import { DEFAULT_POLICY, SEAT_HOLD_TTL_SECONDS } from '../config';

function iso(d: Date): string {
  return d.toISOString();
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Build a coach seat layout grid.
 * `pattern` describes seats per side of the aisle, e.g. [2,2] => 2+2, [2,1] => 2+1.
 * `categoryRows` maps a category to the row range it occupies.
 */
function buildLayout(opts: {
  id: string;
  name: string;
  rows: number;
  pattern: [number, number];
  categoryFor: (row: number) => SeatCategory;
  createdAt: string;
}): SeatLayout {
  const [left, right] = opts.pattern;
  const cols = left + 1 + right; // +1 aisle
  const cells: SeatCell[] = [];
  const letters = 'ABCDEF';
  for (let row = 1; row <= opts.rows; row += 1) {
    const category = opts.categoryFor(row);
    let seatIdx = 0;
    for (let col = 0; col < cols; col += 1) {
      const isAisle = col === left;
      if (isAisle) {
        cells.push({ id: '', row, col, kind: 'aisle', category });
      } else {
        const letter = letters[seatIdx] ?? 'X';
        seatIdx += 1;
        cells.push({ id: `${row}${letter}`, row, col, kind: 'seat', category });
      }
    }
  }
  const capacity = cells.filter((c) => c.kind === 'seat').length;
  return {
    id: opts.id,
    name: opts.name,
    rows: opts.rows,
    cols,
    cells,
    capacity,
    createdAt: opts.createdAt,
    updatedAt: opts.createdAt,
  };
}

export interface SeedData {
  seatLayouts: SeatLayout[];
  buses: Bus[];
  boardingPoints: BoardingPoint[];
  routes: Route[];
  schedules: Schedule[];
  promotions: Promotion[];
  faqs: FaqItem[];
  announcements: Announcement[];
  contentPages: ContentPage[];
  users: AppUser[];
  staff: StaffProfile[];
  settings: SystemSettings;
}

/** Build the full demo dataset relative to `now` so trips are always upcoming. */
export function buildSeed(now: Date): SeedData {
  const ts = iso(now);

  const seatLayouts: SeatLayout[] = [
    buildLayout({
      id: 'layout_coach48',
      name: 'Standard Coach (48)',
      rows: 12,
      pattern: [2, 2],
      categoryFor: (row) => (row === 1 ? 'vip' : row <= 3 ? 'business' : 'standard'),
      createdAt: ts,
    }),
    buildLayout({
      id: 'layout_exec30',
      name: 'Executive Coach (30)',
      rows: 10,
      pattern: [2, 1],
      categoryFor: (row) => (row <= 3 ? 'vip' : 'business'),
      createdAt: ts,
    }),
  ];

  const buses: Bus[] = [
    {
      id: 'bus_express1',
      busNumber: 'GR-1234-22',
      name: 'SMG Express 1',
      category: 'standard',
      seatLayoutId: 'layout_coach48',
      capacity: 48,
      amenities: ['Air conditioning', 'USB charging', 'Reclining seats'],
      status: 'active',
      blockedSeatIds: [],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'bus_express2',
      busNumber: 'GR-2244-23',
      name: 'SMG Express 2',
      category: 'standard',
      seatLayoutId: 'layout_coach48',
      capacity: 48,
      amenities: ['Air conditioning', 'USB charging', 'On-board WiFi'],
      status: 'active',
      blockedSeatIds: ['12A'], // demo: one maintenance-blocked seat
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'bus_business1',
      busNumber: 'GT-5678-24',
      name: 'SMG Business Class',
      category: 'business',
      seatLayoutId: 'layout_coach48',
      capacity: 48,
      amenities: ['Air conditioning', 'WiFi', 'Refreshments', 'Extra legroom'],
      status: 'active',
      blockedSeatIds: [],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'bus_vip1',
      busNumber: 'GW-9012-24',
      name: 'SMG VIP Executive',
      category: 'vip',
      seatLayoutId: 'layout_exec30',
      capacity: 30,
      amenities: ['Air conditioning', 'WiFi', 'Refreshments', 'Reclining loungers', 'Entertainment'],
      status: 'active',
      blockedSeatIds: [],
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const cities = ['Accra', 'Kumasi', 'Cape Coast', 'Takoradi', 'Tema', 'Kasoa', 'Winneba'];
  const boardingPoints: BoardingPoint[] = cities.map((city) => ({
    id: `bp_${city.toLowerCase().replace(/\s+/g, '')}`,
    city,
    name: `${city} Terminal`,
    address: `${city} Main Lorry Station (placeholder address)`,
    createdAt: ts,
    updatedAt: ts,
  }));

  const routeDefs = [
    { code: 'CC-AC', origin: 'Cape Coast', destination: 'Accra', km: 144, min: 180, base: 70, popular: true },
    { code: 'AC-CC', origin: 'Accra', destination: 'Cape Coast', km: 144, min: 180, base: 70, popular: true },
    { code: 'AC-KU', origin: 'Accra', destination: 'Kumasi', km: 250, min: 270, base: 120, popular: true },
    { code: 'KU-AC', origin: 'Kumasi', destination: 'Accra', km: 250, min: 270, base: 120, popular: true },
    { code: 'CC-TK', origin: 'Cape Coast', destination: 'Takoradi', km: 92, min: 95, base: 45, popular: false },
    { code: 'AC-TK', origin: 'Accra', destination: 'Takoradi', km: 218, min: 240, base: 110, popular: true },
  ];

  const routes: Route[] = routeDefs.map((r) => ({
    id: `route_${r.code.toLowerCase().replace('-', '')}`,
    code: r.code,
    origin: r.origin,
    destination: r.destination,
    originBoardingPointId: `bp_${r.origin.toLowerCase().replace(/\s+/g, '')}`,
    destinationBoardingPointId: `bp_${r.destination.toLowerCase().replace(/\s+/g, '')}`,
    distanceKm: r.km,
    durationMinutes: r.min,
    description: `${r.origin} to ${r.destination} — comfortable intercity service. (Sample route, pending CEO approval.)`,
    popular: r.popular,
    createdAt: ts,
    updatedAt: ts,
  }));

  // Generate schedules for the next 7 days, a few departures per route.
  const departureTimes = ['06:00', '10:30', '14:00', '18:30'];
  const busRotation = ['bus_express1', 'bus_express2', 'bus_business1', 'bus_vip1'];
  const schedules: Schedule[] = [];
  let rotation = 0;
  for (const route of routes) {
    const def = routeDefs.find((d) => d.code === route.code)!;
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const date = dateOnly(addDays(now, dayOffset));
      // Use 2–3 departures per day depending on route popularity.
      const times = route.popular ? departureTimes : departureTimes.slice(0, 2);
      for (const departureTime of times) {
        const busId = busRotation[rotation % busRotation.length]!;
        rotation += 1;
        const bus = buses.find((b) => b.id === busId)!;
        const arrivalTime = addMinutesToTime(departureTime, def.min);
        const fares = {
          standard: def.base,
          business: Math.round(def.base * 1.4),
          vip: Math.round(def.base * 1.9),
        };
        schedules.push({
          id: `sch_${route.code.toLowerCase().replace('-', '')}_${date}_${departureTime.replace(':', '')}`,
          routeId: route.id,
          busId: bus.id,
          date,
          departureTime,
          arrivalTime,
          status: 'scheduled',
          fares,
          serviceFee: 5,
          bookedSeatIds: [],
          createdAt: ts,
          updatedAt: ts,
        });
      }
    }
  }

  // Demo: pre-book a handful of seats on the first few schedules to show occupancy.
  for (const sch of schedules.slice(0, 6)) {
    sch.bookedSeatIds = ['4A', '4B', '5C', '7A', '7B'];
  }

  const promotions: Promotion[] = [
    {
      id: 'promo_earlybird',
      code: 'EARLYBIRD',
      title: 'Early Bird — 15% off',
      description: 'Book ahead and save 15% on the base fare across all sample routes.',
      type: 'percent',
      value: 15,
      active: true,
      startsAt: iso(addDays(now, -7)),
      endsAt: iso(addDays(now, 30)),
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'promo_student10',
      code: 'STUDENT10',
      title: 'Student Special — GH₵10 off',
      description: 'A flat GH₵10 discount for students. (Sample promotion.)',
      type: 'flat',
      value: 10,
      active: true,
      startsAt: iso(addDays(now, -7)),
      endsAt: iso(addDays(now, 30)),
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const faqs: FaqItem[] = [
    {
      id: 'faq_book',
      question: 'How do I book a ticket with SMG?',
      answer:
        'Choose your departure city, destination and travel date on the Book a Trip page, pick a departure, select your seat, enter passenger details and pay securely. Your e-ticket is issued instantly.',
      category: 'Booking',
      order: 1,
      published: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'faq_pay',
      question: 'What payment methods can I use?',
      answer:
        'You can pay with Mobile Money (MTN, Telecel/Vodafone Cash, AirtelTigo Money) or with Visa and Mastercard. Corporate customers can arrange bank transfers.',
      category: 'Payments',
      order: 2,
      published: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'faq_change',
      question: 'Can I cancel or reschedule my trip?',
      answer:
        'Yes, within the policy window. Cancellation and rescheduling cut-off times and any fees are shown before you confirm and on your booking page. (Final values are pending approval.)',
      category: 'Changes',
      order: 3,
      published: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'faq_ticket',
      question: 'How do I show my ticket at the terminal?',
      answer:
        'Present the QR code on your e-ticket (on your phone or printed) at boarding. Our staff will scan it to verify your booking reference.',
      category: 'Boarding',
      order: 4,
      published: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'faq_arrive',
      question: 'How early should I arrive before departure?',
      answer:
        'Please arrive at least 30 minutes before your scheduled departure time so we can verify your ticket and board on time.',
      category: 'Boarding',
      order: 5,
      published: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'faq_account',
      question: 'Do I need an account to book?',
      answer:
        'No. You can check out as a guest. Creating an account lets you manage trips, store passenger details and re-download tickets easily.',
      category: 'Account',
      order: 6,
      published: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const announcements: Announcement[] = [
    {
      id: 'ann_launch',
      title: 'New digital booking portal',
      body: 'Welcome to the new SMG Transport Agency booking experience — real-time seat selection and secure payments.',
      level: 'success',
      active: true,
      publishedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'ann_holiday',
      title: 'Festive season schedules',
      body: 'Extra departures are added during public holidays. Book early to secure your preferred seat.',
      level: 'info',
      active: true,
      publishedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const contentPages: ContentPage[] = [
    {
      id: 'page_about',
      slug: 'about',
      title: 'About SMG Transport Agency',
      body: 'SMG Transport Agency is a youth-driven intercity and intra-city transport company founded by Gabriel Atuobi, a University of Cape Coast graduate. We exist to make travel across Ghana affordable, reliable, comfortable and transparent.',
      published: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'page_mission',
      slug: 'mission',
      title: 'Our Mission',
      body: 'To redefine intercity travel in Ghana with technology, transparency and genuine customer care.',
      published: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const users: AppUser[] = [
    {
      id: 'user_ama',
      email: 'ama@example.com',
      fullName: 'Ama Mensah',
      phone: '+233241234567',
      emailVerified: true,
      savedPassengers: [
        {
          fullName: 'Ama Mensah',
          phone: '+233241234567',
          email: 'ama@example.com',
          idType: 'ghana_card',
          idNumber: 'GHA-000000000-0',
        },
      ],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'user_kofi',
      email: 'kofi@example.com',
      fullName: 'Kofi Boateng',
      phone: '+233201112233',
      emailVerified: true,
      savedPassengers: [],
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const staff: StaffProfile[] = [
    {
      id: 'staff_admin',
      email: process.env.DEMO_ADMIN_EMAIL ?? 'projects@azlearner.me',
      fullName: 'SMG Super Administrator',
      role: 'super_admin',
      active: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'staff_ops',
      email: 'ops@smgtransport.test',
      fullName: 'Operations Manager',
      role: 'operations_manager',
      active: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: 'staff_inspector',
      email: 'inspector@smgtransport.test',
      fullName: 'Ticket Inspector',
      role: 'ticket_inspector',
      active: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ];

  const settings: SystemSettings = {
    cancellationCutoffHours: DEFAULT_POLICY.cancellationCutoffHours,
    reschedulingCutoffHours: DEFAULT_POLICY.reschedulingCutoffHours,
    cancellationFeePercent: DEFAULT_POLICY.cancellationFeePercent,
    maxReschedules: DEFAULT_POLICY.maxReschedules,
    refundProcessingDays: DEFAULT_POLICY.refundProcessingDays,
    nonRefundableFareCategories: [...DEFAULT_POLICY.nonRefundableFareCategories],
    seatHoldTtlSeconds: SEAT_HOLD_TTL_SECONDS,
  };

  return {
    seatLayouts,
    buses,
    boardingPoints,
    routes,
    schedules,
    promotions,
    faqs,
    announcements,
    contentPages,
    users,
    staff,
    settings,
  };
}
