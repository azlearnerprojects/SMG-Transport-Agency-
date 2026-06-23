/**
 * Tiny in-memory fixed-window rate limiter for abuse-prone endpoints (booking
 * lookup, contact form). Keyed by client IP. For multi-instance production this
 * should be backed by Redis or Firestore, but it is sufficient for a single-node
 * deployment and for the demo. State is kept on globalThis to survive HMR.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const g = globalThis as unknown as { __smgRate?: Map<string, Bucket> };
const buckets = g.__smgRate ?? (g.__smgRate = new Map<string, Bucket>());

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Best-effort client IP from a Next.js request. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'local';
}
