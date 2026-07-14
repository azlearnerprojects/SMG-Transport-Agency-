import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendSms } from '@/lib/sms';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('sendSms', () => {
  it('sends Arkesel SMS requests with normalized Ghana phone numbers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'success', data: { id: 'msg_123' } }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    process.env.SMS_PROVIDER = 'arkesel';
    process.env.SMS_API_KEY = 'test-api-key';
    process.env.SMS_SENDER_ID = 'SMG';

    const result = await sendSms({
      to: '0241234567',
      body: 'Ticket confirmed.',
    });

    expect(result).toEqual({ delivered: true, providerMessageId: 'msg_123' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sms.arkesel.com/api/v2/sms/send',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': 'test-api-key',
        },
        body: JSON.stringify({
          sender: 'SMG',
          message: 'Ticket confirmed.',
          recipients: ['+233241234567'],
        }),
      }),
    );
  });

  it('does not call Arkesel when the phone number is invalid', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    process.env.SMS_PROVIDER = 'arkesel';
    process.env.SMS_API_KEY = 'test-api-key';
    process.env.SMS_SENDER_ID = 'SMG';

    const result = await sendSms({
      to: 'not-a-phone',
      body: 'Ticket confirmed.',
    });

    expect(result.delivered).toBe(false);
    expect(result.error).toBe('Invalid recipient phone number.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs but does not send when SMS credentials are incomplete', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    process.env.SMS_PROVIDER = 'arkesel';
    process.env.SMS_API_KEY = '';
    process.env.SMS_SENDER_ID = 'SMG';

    const result = await sendSms({
      to: '+233241234567',
      body: 'Ticket confirmed.',
    });

    expect(result.delivered).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
