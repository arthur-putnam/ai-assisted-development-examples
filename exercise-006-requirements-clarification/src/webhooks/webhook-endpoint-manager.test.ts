import { describe, it, expect, vi } from 'vitest';
import { InMemoryWebhookEndpointManager, VerifyEndpointFn } from './webhook-endpoint-manager.js';

describe('InMemoryWebhookEndpointManager', () => {
  function createManager(verifyFn?: VerifyEndpointFn) {
    const defaultVerify: VerifyEndpointFn = async () => ({ verified: true });
    return new InMemoryWebhookEndpointManager(verifyFn ?? defaultVerify);
  }

  describe('registerEndpoint', () => {
    it('should register and activate endpoint when verification succeeds', async () => {
      const manager = createManager();

      const result = await manager.registerEndpoint('cust-1', 'https://example.com/webhook');

      expect(result.success).toBe(true);
      expect(result.errorMessage).toBeUndefined();

      const endpoint = await manager.getActiveEndpoint('cust-1');
      expect(endpoint).not.toBeNull();
      expect(endpoint!.customerId).toBe('cust-1');
      expect(endpoint!.endpointUrl).toBe('https://example.com/webhook');
      expect(endpoint!.active).toBe(true);
      expect(endpoint!.secret).toHaveLength(64); // 32 bytes hex = 64 chars
      expect(endpoint!.verifiedAt).toBeInstanceOf(Date);
    });

    it('should reject endpoint when verification fails', async () => {
      const verifyFn: VerifyEndpointFn = async () => ({
        verified: false,
        errorMessage: 'Endpoint did not respond with 2xx within 5 seconds',
      });
      const manager = createManager(verifyFn);

      const result = await manager.registerEndpoint('cust-1', 'https://bad.com/webhook');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Endpoint did not respond with 2xx within 5 seconds');

      const endpoint = await manager.getActiveEndpoint('cust-1');
      expect(endpoint).toBeNull();
    });

    it('should use default error message when verification fails without message', async () => {
      const verifyFn: VerifyEndpointFn = async () => ({ verified: false });
      const manager = createManager(verifyFn);

      const result = await manager.registerEndpoint('cust-1', 'https://bad.com/webhook');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Endpoint verification failed');
    });

    it('should call verifyEndpoint with the provided URL', async () => {
      const verifyFn = vi.fn<VerifyEndpointFn>(async () => ({ verified: true }));
      const manager = new InMemoryWebhookEndpointManager(verifyFn);

      await manager.registerEndpoint('cust-1', 'https://my-service.com/hooks');

      expect(verifyFn).toHaveBeenCalledWith('https://my-service.com/hooks');
    });

    it('should replace existing endpoint for the same customer', async () => {
      const manager = createManager();

      await manager.registerEndpoint('cust-1', 'https://old.com/webhook');
      await manager.registerEndpoint('cust-1', 'https://new.com/webhook');

      const endpoint = await manager.getActiveEndpoint('cust-1');
      expect(endpoint!.endpointUrl).toBe('https://new.com/webhook');
    });

    it('should generate unique secrets per registration', async () => {
      const manager = createManager();

      await manager.registerEndpoint('cust-1', 'https://a.com/webhook');
      const first = await manager.getActiveEndpoint('cust-1');

      await manager.registerEndpoint('cust-1', 'https://b.com/webhook');
      const second = await manager.getActiveEndpoint('cust-1');

      expect(first!.secret).not.toBe(second!.secret);
    });
  });

  describe('getActiveEndpoint', () => {
    it('should return null for unknown customer', async () => {
      const manager = createManager();

      const endpoint = await manager.getActiveEndpoint('unknown');

      expect(endpoint).toBeNull();
    });

    it('should return null for deactivated endpoint', async () => {
      const manager = createManager();
      await manager.registerEndpoint('cust-1', 'https://example.com/webhook');
      await manager.deactivateEndpoint('cust-1');

      const endpoint = await manager.getActiveEndpoint('cust-1');

      expect(endpoint).toBeNull();
    });

    it('should return active endpoint', async () => {
      const manager = createManager();
      await manager.registerEndpoint('cust-1', 'https://example.com/webhook');

      const endpoint = await manager.getActiveEndpoint('cust-1');

      expect(endpoint).not.toBeNull();
      expect(endpoint!.active).toBe(true);
    });
  });

  describe('deactivateEndpoint', () => {
    it('should deactivate an active endpoint', async () => {
      const manager = createManager();
      await manager.registerEndpoint('cust-1', 'https://example.com/webhook');

      await manager.deactivateEndpoint('cust-1');

      const endpoint = await manager.getActiveEndpoint('cust-1');
      expect(endpoint).toBeNull();
    });

    it('should not throw for unknown customer', async () => {
      const manager = createManager();

      await expect(manager.deactivateEndpoint('unknown')).resolves.toBeUndefined();
    });

    it('should not throw when deactivating already inactive endpoint', async () => {
      const manager = createManager();
      await manager.registerEndpoint('cust-1', 'https://example.com/webhook');
      await manager.deactivateEndpoint('cust-1');

      await expect(manager.deactivateEndpoint('cust-1')).resolves.toBeUndefined();
    });
  });
});
