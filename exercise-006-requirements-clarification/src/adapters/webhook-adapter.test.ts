import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { WebhookAdapter, HttpClient, HttpResponse, WebhookEndpointResolver } from './webhook-adapter.js';
import { NotificationContent } from '../types/index.js';

function createMockHttpClient(response?: Partial<HttpResponse>, error?: Error): HttpClient {
  return {
    post: error
      ? vi.fn().mockRejectedValue(error)
      : vi.fn().mockResolvedValue({ statusCode: 200, ...response }),
  };
}

function createMockResolver(endpoint: { endpointUrl: string; secret: string } | null): WebhookEndpointResolver {
  return {
    getEndpoint: vi.fn().mockResolvedValue(endpoint),
  };
}

const sampleContent: NotificationContent = {
  subject: 'Order Placed',
  body: 'Your order #123 has been placed.',
  metadata: { orderId: '123' },
};

describe('WebhookAdapter', () => {
  describe('send()', () => {
    it('should return success when endpoint responds with 200', async () => {
      const httpClient = createMockHttpClient({ statusCode: 200 });
      const resolver = createMockResolver({ endpointUrl: 'https://example.com/webhook', secret: 'mysecret' });
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.send('customer-1', sampleContent);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should return success for any 2xx status code', async () => {
      const httpClient = createMockHttpClient({ statusCode: 202 });
      const resolver = createMockResolver({ endpointUrl: 'https://example.com/webhook', secret: 'secret' });
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.send('customer-1', sampleContent);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(202);
    });

    it('should return failure for non-2xx status codes', async () => {
      const httpClient = createMockHttpClient({ statusCode: 500 });
      const resolver = createMockResolver({ endpointUrl: 'https://example.com/webhook', secret: 'secret' });
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.send('customer-1', sampleContent);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.errorMessage).toContain('500');
    });

    it('should return failure when no endpoint is found for the customer', async () => {
      const httpClient = createMockHttpClient();
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.send('unknown-customer', sampleContent);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('No active webhook endpoint found');
      expect(result.errorMessage).toContain('unknown-customer');
    });

    it('should handle network errors gracefully', async () => {
      const httpClient = createMockHttpClient(undefined, new Error('Connection refused'));
      const resolver = createMockResolver({ endpointUrl: 'https://example.com/webhook', secret: 'secret' });
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.send('customer-1', sampleContent);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Connection refused');
    });

    it('should handle non-Error thrown objects', async () => {
      const httpClient: HttpClient = {
        post: vi.fn().mockRejectedValue('string error'),
      };
      const resolver = createMockResolver({ endpointUrl: 'https://example.com/webhook', secret: 'secret' });
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.send('customer-1', sampleContent);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Unknown webhook delivery error');
    });

    it('should include HMAC-SHA256 signature header in the request', async () => {
      const secret = 'webhook-secret';
      const httpClient = createMockHttpClient({ statusCode: 200 });
      const resolver = createMockResolver({ endpointUrl: 'https://example.com/webhook', secret });
      const adapter = new WebhookAdapter(httpClient, resolver);

      await adapter.send('customer-1', sampleContent);

      const payload = JSON.stringify(sampleContent);
      const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

      expect(httpClient.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        payload,
        expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Webhook-Signature': expectedSignature,
        }),
        10_000,
      );
    });

    it('should send JSON payload to the correct endpoint URL', async () => {
      const httpClient = createMockHttpClient({ statusCode: 200 });
      const resolver = createMockResolver({ endpointUrl: 'https://api.company.com/hooks/orders', secret: 'sec' });
      const adapter = new WebhookAdapter(httpClient, resolver);

      await adapter.send('cust-42', sampleContent);

      expect(httpClient.post).toHaveBeenCalledWith(
        'https://api.company.com/hooks/orders',
        JSON.stringify(sampleContent),
        expect.any(Object),
        10_000,
      );
    });

    it('should resolve endpoint using the correct customer ID', async () => {
      const httpClient = createMockHttpClient({ statusCode: 200 });
      const resolver = createMockResolver({ endpointUrl: 'https://example.com/webhook', secret: 'sec' });
      const adapter = new WebhookAdapter(httpClient, resolver);

      await adapter.send('customer-abc', sampleContent);

      expect(resolver.getEndpoint).toHaveBeenCalledWith('customer-abc');
    });
  });

  describe('signPayload()', () => {
    it('should produce a valid HMAC-SHA256 hex signature', () => {
      const httpClient = createMockHttpClient();
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const payload = '{"test":"data"}';
      const secret = 'my-secret';
      const result = adapter.signPayload(payload, secret);

      const expected = createHmac('sha256', secret).update(payload).digest('hex');
      expect(result).toBe(expected);
    });

    it('should produce different signatures for different secrets', () => {
      const httpClient = createMockHttpClient();
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const payload = '{"data":"same"}';
      const sig1 = adapter.signPayload(payload, 'secret-a');
      const sig2 = adapter.signPayload(payload, 'secret-b');

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different payloads', () => {
      const httpClient = createMockHttpClient();
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const secret = 'same-secret';
      const sig1 = adapter.signPayload('{"a":1}', secret);
      const sig2 = adapter.signPayload('{"a":2}', secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should be deterministic - same inputs produce same output', () => {
      const httpClient = createMockHttpClient();
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const payload = 'consistent-payload';
      const secret = 'consistent-secret';

      const sig1 = adapter.signPayload(payload, secret);
      const sig2 = adapter.signPayload(payload, secret);

      expect(sig1).toBe(sig2);
    });
  });

  describe('verifyEndpoint()', () => {
    it('should return verified=true for 2xx responses', async () => {
      const httpClient = createMockHttpClient({ statusCode: 200 });
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.verifyEndpoint('https://example.com/webhook');

      expect(result.verified).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should return verified=true for 204 response', async () => {
      const httpClient = createMockHttpClient({ statusCode: 204 });
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.verifyEndpoint('https://example.com/webhook');

      expect(result.verified).toBe(true);
    });

    it('should return verified=false for non-2xx responses', async () => {
      const httpClient = createMockHttpClient({ statusCode: 403 });
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.verifyEndpoint('https://example.com/webhook');

      expect(result.verified).toBe(false);
      expect(result.errorMessage).toContain('403');
    });

    it('should return verified=false for 500 server error', async () => {
      const httpClient = createMockHttpClient({ statusCode: 500 });
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.verifyEndpoint('https://example.com/webhook');

      expect(result.verified).toBe(false);
      expect(result.errorMessage).toContain('500');
    });

    it('should return verified=false on timeout/network error', async () => {
      const httpClient = createMockHttpClient(undefined, new Error('Request timed out'));
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.verifyEndpoint('https://unreachable.example.com/webhook');

      expect(result.verified).toBe(false);
      expect(result.errorMessage).toContain('Request timed out');
    });

    it('should use 5-second timeout for verification requests', async () => {
      const httpClient = createMockHttpClient({ statusCode: 200 });
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      await adapter.verifyEndpoint('https://example.com/webhook');

      expect(httpClient.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.any(String),
        expect.any(Object),
        5_000,
      );
    });

    it('should send a verification JSON payload', async () => {
      const httpClient = createMockHttpClient({ statusCode: 200 });
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      await adapter.verifyEndpoint('https://example.com/webhook');

      expect(httpClient.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        JSON.stringify({ type: 'verification' }),
        expect.objectContaining({ 'Content-Type': 'application/json' }),
        5_000,
      );
    });

    it('should handle non-Error thrown objects during verification', async () => {
      const httpClient: HttpClient = {
        post: vi.fn().mockRejectedValue(42),
      };
      const resolver = createMockResolver(null);
      const adapter = new WebhookAdapter(httpClient, resolver);

      const result = await adapter.verifyEndpoint('https://example.com/webhook');

      expect(result.verified).toBe(false);
      expect(result.errorMessage).toContain('Unknown verification error');
    });
  });
});
