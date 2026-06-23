import QRCode from 'qrcode';
import { APP_URL } from './config';
import { signReference } from './verify-token';

/** Build the secure verification URL a ticket QR code points to. */
export function buildVerificationUrl(reference: string): string {
  const token = signReference(reference);
  const url = new URL('/verify', APP_URL);
  url.searchParams.set('ref', reference);
  url.searchParams.set('t', token);
  return url.toString();
}

/** Generate a PNG data URL for a ticket QR code. Encodes only the verify URL. */
export async function generateTicketQr(reference: string): Promise<string> {
  return QRCode.toDataURL(buildVerificationUrl(reference), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
    color: { dark: '#003366', light: '#FFFFFF' },
  });
}
