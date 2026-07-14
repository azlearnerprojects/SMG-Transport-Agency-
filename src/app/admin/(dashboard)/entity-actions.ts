'use server';

import { revalidatePath } from 'next/cache';
import { getDb, type DeletableEntity } from '@/lib/db';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import {
  busSchema,
  fareCategoryConfigSchema,
  routeSchema,
  scheduleSchema,
  seatLayoutTemplateSchema,
} from '@/lib/schemas';
import { buildSeatLayoutTemplate } from '@/lib/seat-layouts';
import { getBusDeletionConflict } from '@/lib/admin/delete-guards';
import type { StaffRole } from '@/lib/types';

function idFrom(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  return id || undefined;
}

function boolFrom(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

function linesFrom(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function requireRole(roles: StaffRole[]) {
  const session = await getStaffSession();
  if (!session || !roleAllowed(session, roles)) {
    throw new Error('Not authorised.');
  }
  return session;
}

export async function saveRoute(formData: FormData) {
  const session = await requireRole(['operations_manager']);
  const parsed = routeSchema.parse({
    code: formData.get('code'),
    origin: formData.get('origin'),
    destination: formData.get('destination'),
    originBoardingPointId: formData.get('originBoardingPointId'),
    destinationBoardingPointId: formData.get('destinationBoardingPointId'),
    distanceKm: formData.get('distanceKm'),
    durationMinutes: formData.get('durationMinutes'),
    description: formData.get('description'),
    popular: boolFrom(formData, 'popular'),
    status: formData.get('status'),
  });
  if (parsed.origin === parsed.destination) throw new Error('Origin and destination must be different.');
  const db = getDb();
  const record = await db.upsertRoute(idFrom(formData), {
    ...parsed,
    originBoardingPointId: parsed.originBoardingPointId || `bp_${parsed.origin.toLowerCase().replace(/\s+/g, '')}`,
    destinationBoardingPointId: parsed.destinationBoardingPointId || `bp_${parsed.destination.toLowerCase().replace(/\s+/g, '')}`,
    description: parsed.description || '',
  });
  await db.addAudit({
    actor: session.email,
    action: idFrom(formData) ? 'route.updated' : 'route.created',
    target: record.id,
    detail: `${record.origin} to ${record.destination} (${record.status ?? 'draft'})`,
  });
  revalidatePath('/admin/routes');
  revalidatePath('/');
  revalidatePath('/routes');
  revalidatePath('/book');
}

export async function saveBus(formData: FormData) {
  const session = await requireRole(['operations_manager']);
  const parsed = busSchema.parse({
    busNumber: formData.get('busNumber'),
    name: formData.get('name'),
    category: formData.get('category'),
    seatLayoutId: formData.get('seatLayoutId'),
    amenities: linesFrom(formData.get('amenities')),
    status: formData.get('status'),
  });
  const db = getDb();
  const record = await db.upsertBus(idFrom(formData), {
    ...parsed,
    blockedSeatIds: linesFrom(formData.get('blockedSeatIds')),
  });
  await db.addAudit({
    actor: session.email,
    action: idFrom(formData) ? 'bus.updated' : 'bus.created',
    target: record.id,
    detail: `${record.busNumber} (${record.status})`,
  });
  revalidatePath('/admin/buses');
  revalidatePath('/fleet');
  revalidatePath('/book');
}

export async function saveSeatLayout(formData: FormData) {
  const session = await requireRole(['operations_manager']);
  const parsed = seatLayoutTemplateSchema.parse({
    name: formData.get('name'),
    rows: formData.get('rows'),
    leftSeats: formData.get('leftSeats'),
    rightSeats: formData.get('rightSeats'),
    vipRows: formData.get('vipRows'),
    businessRows: formData.get('businessRows'),
  });
  const now = new Date().toISOString();
  const template = buildSeatLayoutTemplate({
    id: idFrom(formData) ?? 'layout_new',
    ...parsed,
    createdAt: now,
    updatedAt: now,
  });
  const db = getDb();
  const record = await db.upsertLayout(idFrom(formData), {
    name: template.name,
    rows: template.rows,
    cols: template.cols,
    cells: template.cells,
    capacity: template.capacity,
  });
  await db.addAudit({
    actor: session.email,
    action: idFrom(formData) ? 'layout.updated' : 'layout.created',
    target: record.id,
    detail: `${record.name} (${record.capacity} seats)`,
  });
  revalidatePath('/admin/seat-layouts');
  revalidatePath('/admin/buses');
  revalidatePath('/book');
}

export async function saveFareCategory(formData: FormData) {
  const session = await requireRole(['operations_manager', 'finance_officer']);
  const parsed = fareCategoryConfigSchema.parse({
    key: formData.get('key'),
    label: formData.get('label'),
    description: formData.get('description'),
    active: boolFrom(formData, 'active'),
    order: formData.get('order'),
  });
  const db = getDb();
  const record = await db.upsertFareCategory(idFrom(formData), parsed);
  await db.addAudit({
    actor: session.email,
    action: 'fare_category.updated',
    target: record.id,
    detail: `${record.label} (${record.active ? 'active' : 'inactive'})`,
  });
  revalidatePath('/admin/fare-categories');
  revalidatePath('/book');
}

export async function saveSchedule(formData: FormData) {
  const session = await requireRole(['operations_manager']);
  const parsed = scheduleSchema.parse({
    routeId: formData.get('routeId'),
    busId: formData.get('busId'),
    date: formData.get('date'),
    departureTime: formData.get('departureTime'),
    arrivalTime: formData.get('arrivalTime'),
    fares: {
      standard: formData.get('standardFare'),
      business: formData.get('businessFare'),
      vip: formData.get('vipFare'),
    },
    serviceFee: formData.get('serviceFee'),
    status: formData.get('status'),
  });
  const db = getDb();
  const record = await db.upsertSchedule(idFrom(formData), parsed);
  await db.addAudit({
    actor: session.email,
    action: idFrom(formData) ? 'schedule.updated' : 'schedule.created',
    target: record.id,
    detail: `${record.date} ${record.departureTime} (${record.status})`,
  });
  revalidatePath('/admin/schedules');
  revalidatePath('/');
  revalidatePath('/routes');
  revalidatePath('/book');
}

/* ------------------------------------------------------------------ */
/* Delete actions                                                     */
/* ------------------------------------------------------------------ */

async function deleteEntity(
  kind: DeletableEntity,
  formData: FormData,
  options: {
    roles: StaffRole[];
    /** Return an error message when the record is still referenced elsewhere. */
    guard?: (id: string, db: ReturnType<typeof getDb>) => Promise<string | undefined>;
    revalidate: string[];
  },
) {
  const session = await requireRole(options.roles);
  const id = idFrom(formData);
  if (!id) throw new Error('Missing record id.');
  const db = getDb();
  const conflict = await options.guard?.(id, db);
  if (conflict) throw new Error(conflict);
  const deleted = await db.deleteEntity(kind, id);
  if (!deleted) throw new Error('Record not found. It may already be deleted.');
  await db.addAudit({
    actor: session.email,
    action: `${kind}.deleted`,
    target: id,
    detail: String(formData.get('label') ?? id),
  });
  for (const path of options.revalidate) revalidatePath(path);
}

export async function deleteRoute(formData: FormData) {
  await deleteEntity('route', formData, {
    roles: ['operations_manager'],
    guard: async (id, db) => {
      const schedules = await db.listSchedules();
      return schedules.some((s) => s.routeId === id)
        ? 'This route still has schedules. Delete or reassign its schedules first.'
        : undefined;
    },
    revalidate: ['/admin/routes', '/', '/routes', '/book'],
  });
}

export async function deleteBus(formData: FormData) {
  await deleteEntity('bus', formData, {
    roles: ['operations_manager'],
    guard: async (id, db) => {
      const schedules = await db.listSchedules();
      const today = new Date().toISOString().slice(0, 10);
      return getBusDeletionConflict(id, schedules, today);
    },
    revalidate: ['/admin/buses', '/fleet', '/book'],
  });
}

export async function deleteSeatLayout(formData: FormData) {
  await deleteEntity('seatLayout', formData, {
    roles: ['operations_manager'],
    guard: async (id, db) => {
      const buses = await db.listBuses();
      return buses.some((b) => b.seatLayoutId === id)
        ? 'This seat layout is still used by buses. Update those buses first.'
        : undefined;
    },
    revalidate: ['/admin/seat-layouts', '/admin/buses', '/book'],
  });
}

export async function deleteSchedule(formData: FormData) {
  await deleteEntity('schedule', formData, {
    roles: ['operations_manager'],
    guard: async (id, db) => {
      const schedules = await db.listSchedules();
      const schedule = schedules.find((s) => s.id === id);
      return schedule && schedule.bookedSeatIds.length > 0
        ? 'This schedule has booked seats. Cancel its bookings before deleting.'
        : undefined;
    },
    revalidate: ['/admin/schedules', '/', '/routes', '/book'],
  });
}

