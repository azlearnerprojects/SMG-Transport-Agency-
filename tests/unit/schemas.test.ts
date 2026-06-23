import { describe, it, expect } from 'vitest';
import { ghanaPhone, tripSearchSchema, passengerSchema, createBookingSchema } from '@/lib/schemas';

describe('ghanaPhone', () => {
  it('accepts valid Ghana formats and normalises spaces', () => {
    expect(ghanaPhone.safeParse('0241234567').success).toBe(true);
    expect(ghanaPhone.safeParse('+233241234567').success).toBe(true);
    expect(ghanaPhone.parse('024 123 4567')).toBe('0241234567');
  });
  it('rejects invalid numbers', () => {
    expect(ghanaPhone.safeParse('12345').success).toBe(false);
    expect(ghanaPhone.safeParse('024123').success).toBe(false);
  });
});

describe('tripSearchSchema', () => {
  it('rejects identical origin and destination', () => {
    const r = tripSearchSchema.safeParse({ origin: 'Accra', destination: 'Accra', date: '2026-06-25', passengers: 1 });
    expect(r.success).toBe(false);
  });
  it('accepts a valid search', () => {
    const r = tripSearchSchema.safeParse({ origin: 'Accra', destination: 'Kumasi', date: '2026-06-25', passengers: 2 });
    expect(r.success).toBe(true);
  });
});

describe('passengerSchema', () => {
  it('requires a valid email and name', () => {
    expect(passengerSchema.safeParse({ fullName: 'Jo', phone: '0241234567', email: 'bad', idType: 'none' }).success).toBe(false);
    expect(
      passengerSchema.safeParse({ fullName: 'Jane Doe', phone: '0241234567', email: 'jane@example.com', idType: 'ghana_card' }).success,
    ).toBe(true);
  });
});

describe('createBookingSchema', () => {
  it('requires consent to be true and at least one seat', () => {
    const base = {
      scheduleId: 's1',
      seatIds: ['6A'],
      seatCategory: 'standard' as const,
      passenger: { fullName: 'Jane Doe', phone: '0241234567', email: 'jane@example.com', idType: 'none' as const },
      sessionId: 'sess',
    };
    expect(createBookingSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...base, consent: true }).success).toBe(true);
    expect(createBookingSchema.safeParse({ ...base, seatIds: [], consent: true }).success).toBe(false);
  });
});
