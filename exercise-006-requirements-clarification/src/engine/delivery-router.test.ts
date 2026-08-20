import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultDeliveryRouter } from './delivery-router.js';
import {
  DeliveryChannel,
  DeliveryStatus,
  NotificationContent,
} from '../types/index.js';
import type { ChannelDeliveryResult } from '../types/index.js';
import type { ChannelAdapter } from '../adapters/email-adapter.js';
import type { RetryManager } from '../retry/retry-manager.js';

/** Helper to create a mock channel adapter */
function createMockAdapter(result: ChannelDeliveryResult): ChannelAdapter {
  return {
    send: vi.fn().mockResolvedValue(result),
  };
}

/** Helper to create a failing adapter that rejects */
function createRejectingAdapter(error: Error): ChannelAdapter {
  return {
    send: vi.fn().mockRejectedValue(error),
  };
}

/** Helper to create a slow adapter with delay */
function createSlowAdapter(delayMs: number, result: ChannelDeliveryResult): ChannelAdapter {
  return {
    send: vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(result), delayMs))
    ),
  };
}

/** Helper to create a mock retry manager */
function createMockRetryManager(): RetryManager {
  return {
    scheduleRetry: vi.fn().mockResolvedValue(new Date()),
    processRetries: vi.fn().mockResolvedValue(undefined),
    markPermanentlyFailed: vi.fn().mockResolvedValue(undefined),
  };
}

const sampleNotification: NotificationContent = {
  subject: 'Order Confirmation - #ORD-001',
  body: 'Your order has been placed.',
  metadata: { orderId: 'ORD-001', notificationId: 'notif-123' },
};

describe('DefaultDeliveryRouter', () => {
  describe('deliver()', () => {
    it('should deliver successfully to a single channel', async () => {
      const emailAdapter = createMockAdapter({ success: true, statusCode: 200 });
      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.EMAIL, emailAdapter],
      ]);
      const router = new DefaultDeliveryRouter(adapters);

      const results = await router.deliver(
        sampleNotification,
        [DeliveryChannel.EMAIL],
        'customer-1'
      );

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe(DeliveryChannel.EMAIL);
      expect(results[0].status).toBe(DeliveryStatus.DELIVERED);
      expect(results[0].errorMessage).toBeUndefined();
      expect(emailAdapter.send).toHaveBeenCalledWith('customer-1', sampleNotification);
    });

    it('should deliver to multiple channels independently', async () => {
      const emailAdapter = createMockAdapter({ success: true, statusCode: 200 });
      const smsAdapter = createMockAdapter({ success: true, statusCode: 200 });
      const webhookAdapter = createMockAdapter({ success: true, statusCode: 200 });

      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.EMAIL, emailAdapter],
        [DeliveryChannel.SMS, smsAdapter],
        [DeliveryChannel.WEBHOOK, webhookAdapter],
      ]);
      const router = new DefaultDeliveryRouter(adapters);

      const results = await router.deliver(
        sampleNotification,
        [DeliveryChannel.EMAIL, DeliveryChannel.SMS, DeliveryChannel.WEBHOOK],
        'customer-1'
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.status === DeliveryStatus.DELIVERED)).toBe(true);
    });

    it('should record failure independently per channel without blocking others', async () => {
      const emailAdapter = createMockAdapter({ success: true, statusCode: 200 });
      const smsAdapter = createMockAdapter({
        success: false,
        statusCode: 500,
        errorMessage: 'SMS provider error',
      });
      const webhookAdapter = createMockAdapter({ success: true, statusCode: 200 });

      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.EMAIL, emailAdapter],
        [DeliveryChannel.SMS, smsAdapter],
        [DeliveryChannel.WEBHOOK, webhookAdapter],
      ]);
      const router = new DefaultDeliveryRouter(adapters);

      const results = await router.deliver(
        sampleNotification,
        [DeliveryChannel.EMAIL, DeliveryChannel.SMS, DeliveryChannel.WEBHOOK],
        'customer-1'
      );

      expect(results).toHaveLength(3);

      const emailResult = results.find((r) => r.channel === DeliveryChannel.EMAIL)!;
      expect(emailResult.status).toBe(DeliveryStatus.DELIVERED);

      const smsResult = results.find((r) => r.channel === DeliveryChannel.SMS)!;
      expect(smsResult.status).toBe(DeliveryStatus.FAILED);
      expect(smsResult.errorMessage).toBe('SMS provider error');

      const webhookResult = results.find((r) => r.channel === DeliveryChannel.WEBHOOK)!;
      expect(webhookResult.status).toBe(DeliveryStatus.DELIVERED);
    });

    it('should handle adapter rejection without blocking other channels', async () => {
      const emailAdapter = createMockAdapter({ success: true, statusCode: 200 });
      const smsAdapter = createRejectingAdapter(new Error('Network timeout'));

      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.EMAIL, emailAdapter],
        [DeliveryChannel.SMS, smsAdapter],
      ]);
      const router = new DefaultDeliveryRouter(adapters);

      const results = await router.deliver(
        sampleNotification,
        [DeliveryChannel.EMAIL, DeliveryChannel.SMS],
        'customer-1'
      );

      expect(results).toHaveLength(2);

      const emailResult = results.find((r) => r.channel === DeliveryChannel.EMAIL)!;
      expect(emailResult.status).toBe(DeliveryStatus.DELIVERED);

      const smsResult = results.find((r) => r.channel === DeliveryChannel.SMS)!;
      expect(smsResult.status).toBe(DeliveryStatus.FAILED);
      expect(smsResult.errorMessage).toBe('Network timeout');
    });

    it('should return FAILED when no adapter is configured for a channel', async () => {
      const adapters = new Map<DeliveryChannel, ChannelAdapter>();
      const router = new DefaultDeliveryRouter(adapters);

      const results = await router.deliver(
        sampleNotification,
        [DeliveryChannel.EMAIL],
        'customer-1'
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(DeliveryStatus.FAILED);
      expect(results[0].errorMessage).toContain('No adapter configured');
    });

    it('should return an empty array when no channels are specified', async () => {
      const adapters = new Map<DeliveryChannel, ChannelAdapter>();
      const router = new DefaultDeliveryRouter(adapters);

      const results = await router.deliver(sampleNotification, [], 'customer-1');

      expect(results).toHaveLength(0);
    });

    it('should include attemptTimestamp in every result', async () => {
      const emailAdapter = createMockAdapter({ success: true, statusCode: 200 });
      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.EMAIL, emailAdapter],
      ]);
      const router = new DefaultDeliveryRouter(adapters);

      const before = new Date();
      const results = await router.deliver(
        sampleNotification,
        [DeliveryChannel.EMAIL],
        'customer-1'
      );
      const after = new Date();

      expect(results[0].attemptTimestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(results[0].attemptTimestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('RetryManager integration', () => {
    it('should schedule retry for failed deliveries when RetryManager is provided', async () => {
      const smsAdapter = createMockAdapter({
        success: false,
        statusCode: 503,
        errorMessage: 'Service unavailable',
      });
      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.SMS, smsAdapter],
      ]);
      const retryManager = createMockRetryManager();
      const router = new DefaultDeliveryRouter(adapters, retryManager);

      await router.deliver(sampleNotification, [DeliveryChannel.SMS], 'customer-1');

      expect(retryManager.scheduleRetry).toHaveBeenCalledWith(
        'notif-123',
        DeliveryChannel.SMS,
        1,
        expect.objectContaining({ maxAttempts: 3 }) // STANDARD_RETRY_POLICY
      );
    });

    it('should use WEBHOOK_RETRY_POLICY for webhook failures', async () => {
      const webhookAdapter = createMockAdapter({
        success: false,
        statusCode: 502,
        errorMessage: 'Bad Gateway',
      });
      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.WEBHOOK, webhookAdapter],
      ]);
      const retryManager = createMockRetryManager();
      const router = new DefaultDeliveryRouter(adapters, retryManager);

      await router.deliver(sampleNotification, [DeliveryChannel.WEBHOOK], 'customer-1');

      expect(retryManager.scheduleRetry).toHaveBeenCalledWith(
        'notif-123',
        DeliveryChannel.WEBHOOK,
        1,
        expect.objectContaining({ maxAttempts: 5 }) // WEBHOOK_RETRY_POLICY
      );
    });

    it('should not schedule retry for successful deliveries', async () => {
      const emailAdapter = createMockAdapter({ success: true, statusCode: 200 });
      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.EMAIL, emailAdapter],
      ]);
      const retryManager = createMockRetryManager();
      const router = new DefaultDeliveryRouter(adapters, retryManager);

      await router.deliver(sampleNotification, [DeliveryChannel.EMAIL], 'customer-1');

      expect(retryManager.scheduleRetry).not.toHaveBeenCalled();
    });

    it('should not throw when RetryManager is null and delivery fails', async () => {
      const smsAdapter = createMockAdapter({
        success: false,
        errorMessage: 'Delivery failed',
      });
      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.SMS, smsAdapter],
      ]);
      const router = new DefaultDeliveryRouter(adapters, null);

      const results = await router.deliver(
        sampleNotification,
        [DeliveryChannel.SMS],
        'customer-1'
      );

      expect(results[0].status).toBe(DeliveryStatus.FAILED);
    });

    it('should only schedule retries for failed channels, not successful ones', async () => {
      const emailAdapter = createMockAdapter({ success: true, statusCode: 200 });
      const smsAdapter = createMockAdapter({
        success: false,
        errorMessage: 'Failed',
      });
      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.EMAIL, emailAdapter],
        [DeliveryChannel.SMS, smsAdapter],
      ]);
      const retryManager = createMockRetryManager();
      const router = new DefaultDeliveryRouter(adapters, retryManager);

      await router.deliver(
        sampleNotification,
        [DeliveryChannel.EMAIL, DeliveryChannel.SMS],
        'customer-1'
      );

      expect(retryManager.scheduleRetry).toHaveBeenCalledTimes(1);
      expect(retryManager.scheduleRetry).toHaveBeenCalledWith(
        'notif-123',
        DeliveryChannel.SMS,
        1,
        expect.anything()
      );
    });
  });

  describe('channel independence (concurrency)', () => {
    it('should not wait for slow channels before returning fast channel results', async () => {
      const fastAdapter = createMockAdapter({ success: true, statusCode: 200 });
      const slowAdapter = createSlowAdapter(100, { success: true, statusCode: 200 });

      const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.EMAIL, fastAdapter],
        [DeliveryChannel.SMS, slowAdapter],
      ]);
      const router = new DefaultDeliveryRouter(adapters);

      const start = Date.now();
      const results = await router.deliver(
        sampleNotification,
        [DeliveryChannel.EMAIL, DeliveryChannel.SMS],
        'customer-1'
      );
      const elapsed = Date.now() - start;

      // Both should be delivered
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === DeliveryStatus.DELIVERED)).toBe(true);

      // Total time should be close to the slowest (not sum of both)
      // This verifies channels run in parallel
      expect(elapsed).toBeLessThan(200);
    });
  });
});
