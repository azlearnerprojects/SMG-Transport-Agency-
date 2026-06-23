import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';

export function jsonOk<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(
    { ok: true, data },
    typeof init === 'number' ? { status: init } : init,
  );
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/**
 * Wrap a route handler so unexpected errors return a safe message (never a stack
 * trace or secret) and Zod validation errors return field messages.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return jsonError('Validation failed', 422, {
          fields: err.flatten().fieldErrors,
        });
      }
      logger.error('Unhandled API error', { error: String(err) });
      return jsonError('Something went wrong. Please try again.', 500);
    }
  };
}
