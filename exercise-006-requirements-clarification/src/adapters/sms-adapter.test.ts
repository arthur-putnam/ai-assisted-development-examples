import { describe, it, expect, vi } from 'vitest';
import { SmsAdapter, SmsProviderClient } from './sms-adapter.js';
import { NotificationContent } from '../types/index.js';

function makeContent(overrides: Partial<NotificationContent> = {}): NotificationContent {
  return {
    subject: 'Order Shipped',
    body: 'Your order #456 has shipped.',
    metadata: {},
    ...overrides,
  };
}

describe('SmsAdapter', () => {
  it('returns success when provider responds with 200', async () => {
    const provider: SmsProviderClient = {
      sendSms: vi.fn().mockResolvedValue({ statusCode: 200 }),
    };
    const adapter = new SmsAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.errorMessage).toBeUndefined();
  });

  it('returns success for any 2xx status code', async () => {
    const provider: SmsProviderClient = {
      sendSms: vi.fn().mockResolvedValue({ statusCode: 201 }),
    };
    const adapter = new SmsAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(201);
  });

  it('returns failure when provider responds with 4xx', async () => {
    const provider: SmsProviderClient = {
      sendSms: vi.fn().mockResolvedValue({ statusCode: 429 }),
    };
    const adapter = new SmsAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(429);
    expect(result.errorMessage).toContain('429');
  });

  it('returns failure when provider responds with 5xx', async () => {
    const provider: SmsProviderClient = {
      sendSms: vi.fn().mockResolvedValue({ statusCode: 500 }),
    };
    const adapter = new SmsAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.errorMessage).toContain('500');
  });

  it('handles provider throwing an Error gracefully', async () => {
    const provider: SmsProviderClient = {
      sendSms: vi.fn().mockRejectedValue(new Error('SMS gateway unavailable')),
    };
    const adapter = new SmsAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(false);
    expect(result.statusCode).toBeUndefined();
    expect(result.errorMessage).toBe('SMS gateway unavailable');
  });

  it('handles provider throwing a non-Error value gracefully', async () => {
    const provider: SmsProviderClient = {
      sendSms: vi.fn().mockRejectedValue(42),
    };
    const adapter = new SmsAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unknown SMS delivery error');
  });

  it('concatenates subject and body for the SMS message', async () => {
    const sendSms = vi.fn().mockResolvedValue({ statusCode: 200 });
    const provider: SmsProviderClient = { sendSms };
    const adapter = new SmsAdapter(provider);
    const content = makeContent({ subject: 'Delivered', body: 'Your package arrived.' });

    await adapter.send('cust-99', content);

    expect(sendSms).toHaveBeenCalledWith('cust-99', 'Delivered: Your package arrived.');
  });
});
