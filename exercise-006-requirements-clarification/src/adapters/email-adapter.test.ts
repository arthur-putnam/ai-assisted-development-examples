import { describe, it, expect, vi } from 'vitest';
import { EmailAdapter, EmailProviderClient } from './email-adapter.js';
import { NotificationContent } from '../types/index.js';

function makeContent(overrides: Partial<NotificationContent> = {}): NotificationContent {
  return {
    subject: 'Order Confirmed',
    body: 'Your order #123 has been placed.',
    metadata: {},
    ...overrides,
  };
}

describe('EmailAdapter', () => {
  it('returns success when provider responds with 200', async () => {
    const provider: EmailProviderClient = {
      sendEmail: vi.fn().mockResolvedValue({ statusCode: 200 }),
    };
    const adapter = new EmailAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.errorMessage).toBeUndefined();
  });

  it('returns success for any 2xx status code', async () => {
    const provider: EmailProviderClient = {
      sendEmail: vi.fn().mockResolvedValue({ statusCode: 202 }),
    };
    const adapter = new EmailAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(202);
  });

  it('returns failure when provider responds with 4xx', async () => {
    const provider: EmailProviderClient = {
      sendEmail: vi.fn().mockResolvedValue({ statusCode: 400 }),
    };
    const adapter = new EmailAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.errorMessage).toContain('400');
  });

  it('returns failure when provider responds with 5xx', async () => {
    const provider: EmailProviderClient = {
      sendEmail: vi.fn().mockResolvedValue({ statusCode: 503 }),
    };
    const adapter = new EmailAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(result.errorMessage).toContain('503');
  });

  it('handles provider throwing an Error gracefully', async () => {
    const provider: EmailProviderClient = {
      sendEmail: vi.fn().mockRejectedValue(new Error('Connection timeout')),
    };
    const adapter = new EmailAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(false);
    expect(result.statusCode).toBeUndefined();
    expect(result.errorMessage).toBe('Connection timeout');
  });

  it('handles provider throwing a non-Error value gracefully', async () => {
    const provider: EmailProviderClient = {
      sendEmail: vi.fn().mockRejectedValue('network failure'),
    };
    const adapter = new EmailAdapter(provider);

    const result = await adapter.send('customer-1', makeContent());

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Unknown email delivery error');
  });

  it('passes customerId and content fields to the provider', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ statusCode: 200 });
    const provider: EmailProviderClient = { sendEmail };
    const adapter = new EmailAdapter(provider);
    const content = makeContent({ subject: 'Shipped', body: 'Your order shipped.' });

    await adapter.send('cust-42', content);

    expect(sendEmail).toHaveBeenCalledWith('cust-42', 'Shipped', 'Your order shipped.');
  });
});
