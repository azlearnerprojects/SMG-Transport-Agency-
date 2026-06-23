/** Short, unambiguous id helpers (no 0/O/1/I to avoid confusion on printed tickets). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Customer-facing booking reference, e.g. "SMG-7K3QABCD". */
export function generateReference(): string {
  return `SMG-${randomCode(8)}`;
}

/** Internal ticket number, e.g. "TKT-2026-9X4M2A". */
export function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  return `TKT-${year}-${randomCode(6)}`;
}

/** Generic prefixed id for mock-store records. */
export function generateId(prefix: string): string {
  return `${prefix}_${randomCode(10).toLowerCase()}`;
}
