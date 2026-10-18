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

const BRAND = { navy: '#073B5C', gold: '#F6B73C', ink: '#102A43', muted: '#52667A', surface: '#F5F8FB' };

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] as string);
}

function emailShell(title: string, preheader: string, body: string, siteName: string, supportEmail: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${BRAND.surface};font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:${BRAND.surface}"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(7,59,92,.10)">
        <tr><td style="background:${BRAND.navy};padding:24px 30px;color:#fff"><div style="font-size:13px;letter-spacing:1.4px;font-weight:700;color:${BRAND.gold}">SMG TRANSPORT AGENCY</div><div style="font-size:24px;font-weight:700;margin-top:6px">${escapeHtml(title)}</div></td></tr>
        <tr><td style="padding:30px">${body}</td></tr>
        <tr><td style="padding:20px 30px;background:#F1F5F8;color:${BRAND.muted};font-size:12px;line-height:18px">Need help? Reply to this email or contact <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND.navy}">${escapeHtml(supportEmail)}</a>.<br/>${escapeHtml(siteName)} &middot; Travel made simple.</td></tr>
      </table>
    </td></tr></table></body></html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #E6EDF2;color:${BRAND.muted};width:42%">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid #E6EDF2;font-weight:600">${escapeHtml(value)}</td></tr>`;
}

/** Sends through SMTP when configured. Delivery failures never interrupt bookings. */
export async function sendEmail(message: EmailMessage): Promise<{ delivered: boolean }> {
  if (!smtpConfigured()) {
    logger.info('Email (SMTP not configured, not delivered)', { to: message.to, subject: message.subject });
    return { delivered: false };
  }
  try {
    const { config: site } = await getPublicSiteConfig();
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: Number(process.env.SMTP_PORT ?? 587) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
    await transport.sendMail({ from: process.env.SMTP_FROM_EMAIL ?? `${site.siteName} <${process.env.SMTP_USER}>`, replyTo: site.supportEmail, to: message.to, subject: message.subject, html: message.html, text: message.text });
    return { delivered: true };
  } catch (err) {
    logger.error('Email delivery failed', { to: message.to, error: String(err) });
    return { delivered: false };
  }
}

/** Compose and send the confirmed e-ticket / receipt email. */
export async function sendTicketEmail(booking: Booking): Promise<{ delivered: boolean }> {
  const { config: site } = await getPublicSiteConfig();
  const verifyUrl = buildVerificationUrl(booking.reference);
  const trip = `${booking.origin} to ${booking.destination}`;
  const passengerName = booking.passenger.fullName || 'traveller';
  const text = [`Hello ${passengerName},`, '', `Your trip is confirmed with ${site.siteName}.`, `Reference: ${booking.reference}`, `Route: ${trip}`, `Travel: ${booking.travelDate} at ${booking.departureTime}`, `Seat(s): ${booking.seatIds.join(', ')}`, `Total paid: ${booking.currency} ${booking.total.toFixed(2)}`, '', `View your ticket: ${verifyUrl}`, 'Please arrive at least 30 minutes before departure.'].join('\n');
  const body = `<p style="margin-top:0;font-size:16px">Hello ${escapeHtml(passengerName)},</p><p>Your payment is confirmed and your e-ticket is ready. Keep your reference handy when you board.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;margin:20px 0">${detailRow('Booking reference', booking.reference)}${detailRow('Ticket number', booking.ticketNumber)}${detailRow('Route', trip)}${detailRow('Travel date & time', `${booking.travelDate} at ${booking.departureTime}`)}${detailRow('Bus', `${booking.busNumber} (${booking.busCategory})`)}${detailRow('Seat(s)', booking.seatIds.join(', '))}${detailRow('Amount paid', `${booking.currency} ${booking.total.toFixed(2)}`)}</table><p style="margin:24px 0"><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:${BRAND.gold};color:${BRAND.ink};padding:12px 18px;border-radius:7px;font-weight:700;text-decoration:none">View e-ticket</a></p><p style="color:${BRAND.muted};font-size:14px">Please arrive at least 30 minutes before departure.</p>`;
  return sendEmail({ to: booking.passenger.email, subject: `Your SMG e-ticket: ${booking.reference}`, html: emailShell('Your trip is confirmed', `Your e-ticket for ${trip} is ready.`, body, site.siteName, site.supportEmail), text });
}
