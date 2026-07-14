import { z } from 'zod';

/**
 * Validation schemas. These are reused on BOTH the client (react-hook-form) and
 * the server (API route boundaries) so user input is never trusted from the
 * browser alone.
 */

/** Ghana-friendly phone validation: accepts 0XXXXXXXXX or +233XXXXXXXXX. */
export const ghanaPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ''))
  .refine((v) => /^(?:\+?233|0)\d{9}$/.test(v), {
    message: 'Enter a valid Ghana phone number, e.g. 0241234567 or +233241234567',
  });

export const seatCategorySchema = z.enum(['standard', 'business', 'vip']);

export const tripSearchSchema = z
  .object({
    origin: z.string().min(1, 'Select a departure city'),
    destination: z.string().min(1, 'Select a destination'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a travel date'),
    passengers: z.coerce.number().int().min(1).max(5).default(1),
  })
  .refine((d) => d.origin !== d.destination, {
    message: 'Departure and destination must be different',
    path: ['destination'],
  });
export type TripSearchInput = z.infer<typeof tripSearchSchema>;

export const passengerSchema = z.object({
  fullName: z.string().trim().min(3, 'Enter the full name as it appears on your ID'),
  phone: ghanaPhone,
  email: z.string().trim().email('Enter a valid email address'),
  idType: z.enum(['ghana_card', 'national_id', 'passport', 'student_id', 'none']),
  idNumber: z.string().trim().max(40).optional().or(z.literal('')),
  emergencyContactName: z.string().trim().max(80).optional().or(z.literal('')),
  emergencyContactPhone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^(?:\+?233|0)\d{9}$/.test(v.replace(/\s+/g, '')), {
      message: 'Enter a valid Ghana phone number',
    }),
  specialAssistance: z.string().trim().max(300).optional().or(z.literal('')),
});
export type PassengerInput = z.infer<typeof passengerSchema>;

/** Request body to create a booking + hold seats (server-validated). */
export const createBookingSchema = z.object({
  scheduleId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1, 'Select at least one seat').max(5),
  seatCategory: seatCategorySchema,
  passenger: passengerSchema,
  boardingPoint: z.string().trim().min(2, 'Select a pickup point').max(120),
  promoCode: z.string().trim().max(30).optional().or(z.literal('')),
  sessionId: z.string().min(1),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms to continue' }),
  }),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const holdSeatsSchema = z.object({
  scheduleId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1).max(5),
  sessionId: z.string().min(1),
});

export const initPaymentSchema = z.object({
  bookingReference: z.string().min(1),
  method: z.enum(['mobile_money', 'card', 'bank_transfer']),
});

export const bookingLookupSchema = z.object({
  reference: z.string().trim().min(4, 'Enter your booking reference'),
  contact: z.string().trim().min(3, 'Enter the email or phone used to book'),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().optional().or(z.literal('')),
  subject: z.string().trim().min(3, 'Add a subject'),
  message: z.string().trim().min(10, 'Tell us a bit more (min 10 characters)').max(2000),
  // Honeypot: must stay empty. Bots tend to fill every field.
  website: z.string().max(0).optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Enter your full name'),
    email: z.string().trim().email('Enter a valid email'),
    phone: ghanaPhone,
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/* ---- Admin entity schemas ---- */

export const busSchema = z.object({
  busNumber: z.string().trim().min(2),
  name: z.string().trim().min(2),
  category: z.enum(['standard', 'business', 'vip']),
  seatLayoutId: z.string().min(1),
  amenities: z.array(z.string()).default([]),
  status: z.enum(['active', 'maintenance', 'archived']).default('active'),
});

export const seatLayoutTemplateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    rows: z.coerce.number().int().min(1).max(20),
    leftSeats: z.coerce.number().int().min(1).max(3),
    rightSeats: z.coerce.number().int().min(1).max(3),
    vipRows: z.coerce.number().int().min(0).max(20).default(0),
    businessRows: z.coerce.number().int().min(0).max(20).default(0),
  })
  .refine((layout) => layout.vipRows + layout.businessRows <= layout.rows, {
    message: 'VIP and business rows cannot exceed total rows.',
    path: ['businessRows'],
  });

export const fareCategoryConfigSchema = z.object({
  key: seatCategorySchema,
  label: z.string().trim().min(2).max(80),
  description: z.string().trim().min(4).max(300),
  active: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(999),
});

export const routeSchema = z.object({
  code: z.string().trim().min(2),
  origin: z.string().trim().min(2),
  destination: z.string().trim().min(2),
  originBoardingPointId: z.string().trim().optional().or(z.literal('')),
  destinationBoardingPointId: z.string().trim().optional().or(z.literal('')),
  distanceKm: z.coerce.number().min(1),
  durationMinutes: z.coerce.number().min(15),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  popular: z.boolean().default(false),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

export const scheduleSchema = z.object({
  routeId: z.string().min(1),
  busId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/),
  fares: z.object({
    standard: z.coerce.number().min(0),
    business: z.coerce.number().min(0),
    vip: z.coerce.number().min(0),
  }),
  serviceFee: z.coerce.number().min(0),
  status: z.enum(['scheduled', 'paused', 'cancelled', 'departed', 'completed']).default('scheduled'),
});

export const promotionSchema = z.object({
  code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(4).max(500),
  type: z.enum(['percent', 'flat']),
  value: z.coerce.number().min(0),
  active: z.boolean().default(false),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  routeIds: z.array(z.string()).default([]),
});

export const faqSchema = z.object({
  question: z.string().trim().min(5).max(180),
  answer: z.string().trim().min(8).max(1000),
  category: z.string().trim().min(2).max(80),
  order: z.coerce.number().int().min(0).max(999),
  published: z.boolean().default(false),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(4).max(500),
  level: z.enum(['info', 'success', 'warning']).default('info'),
  active: z.boolean().default(false),
  publishedAt: z.string().min(1),
});

export const contentPageSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only.'),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(10).max(8000),
  published: z.boolean().default(false),
});
