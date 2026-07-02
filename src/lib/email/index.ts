import { logger } from '@/lib/logger';
import { getPublicSiteConfig } from '@/lib/site-config';
import type { Booking } from '@/lib/types';
import { buildVerificationUrl } from '@/lib/qr';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

/**
 * Send an email via SMTP (Nodemailer) when configured. In DEMO mode (no SMTP),
 * the message is logged so the flow is observable without delivering real mail.
 * Failures are caught and logged — email delivery never blocks a booking.
 */
export async function sendEmail(message: EmailMessage): Promise<{ delivered: boolean }> {
  if (!smtpConfigured()) {
    logger.info('Email (SMTP not configured, not delivered)', { to: message.to, subject: message.subject });
    return { delivered: false };
  }
  try {
    const { config: site } = await getPublicSiteConfig();
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM_EMAIL ?? site.supportEmail,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { delivered: true };
  } catch (err) {
    logger.error('Email delivery failed', { to: message.to, error: String(err) });
    return { delivered: false };
  }
}

/** Compose and send the e-ticket / receipt email for a confirmed booking. */
export async function sendTicketEmail(booking: Booking): Promise<{ delivered: boolean }> {
  const { config: site } = await getPublicSiteConfig();
  const verifyUrl = buildVerificationUrl(booking.reference);
  const text = [
    `Thank you for booking with ${site.siteName}!`,
    ``,
    `Booking reference: ${booking.reference}`,
    `Ticket number: ${booking.ticketNumber}`,
    `Route: ${booking.origin} -> ${booking.destination}`,
    `Date: ${booking.travelDate} at ${booking.departureTime}`,
    `Bus: ${booking.busNumber} (${booking.busCategory})`,
    `Seat(s): ${booking.seatIds.join(', ')}`,
    `Total paid: ${booking.currency} ${booking.total.toFixed(2)}`,
    ``,
    `Show this verification link / QR at boarding: ${verifyUrl}`,
    `Please arrive at least 30 minutes before departure.`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
      <div style="background:#003366;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
        <strong style="font-size:18px">${site.siteName}</strong> — E-Ticket
      </div>
      <div style="border:1px solid #eee;border-top:0;padding:20px;border-radius:0 0 8px 8px">
        <p>Thank you for booking with us. Your trip is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td><b>Reference</b></td><td>${booking.reference}</td></tr>
          <tr><td><b>Ticket</b></td><td>${booking.ticketNumber}</td></tr>
          <tr><td><b>Route</b></td><td>${booking.origin} → ${booking.destination}</td></tr>
          <tr><td><b>Date</b></td><td>${booking.travelDate} at ${booking.departureTime}</td></tr>
          <tr><td><b>Bus</b></td><td>${booking.busNumber} (${booking.busCategory})</td></tr>
          <tr><td><b>Seat(s)</b></td><td>${booking.seatIds.join(', ')}</td></tr>
          <tr><td><b>Total paid</b></td><td>${booking.currency} ${booking.total.toFixed(2)}</td></tr>
        </table>
        <p style="margin-top:16px">Verify at boarding: <a href="${verifyUrl}">${verifyUrl}</a></p>
        <p style="color:#666">Please arrive at least 30 minutes before departure.</p>
      </div>
    </div>`;

  return sendEmail({
    to: booking.passenger.email,
    subject: `Your SMG e-ticket — ${booking.reference}`,
    html,
    text,
  });
}
