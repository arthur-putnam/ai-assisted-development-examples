import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryRetryManager, RetryDeliveryFn } from './retry-manager.js';
import { DeliveryChannel, STANDARD_RETRY_POLICY, WEBHOOK_RETRY_POLICY } from '../types/index.js';

describe('InMemoryRetryManager', () => {
  let deliveryFn: RetryDeliveryFn;
  let manager: InMemoryRetryManager;

  beforeEach(() => {
    deliveryFn = vi.fn().mockResolvedValue(true);
    manager = new InMemoryRetryManager(deliveryFn);
  });

  describe('scheduleRetry()', () => {
    it('schedules a retry with correct interval for attempt 1 using standard policy', async () => {
      const before = Date.now();
      const result = await manager.scheduleRetry(
        'notif-1',
        DeliveryChannel.EMAIL,
        1,
        STANDARD_RETRY_POLICY
      );
      const after = Date.now();

      expect(result).not.toBeNull();
      // 1 minute = 60_000 ms
      expect(result!.getTime()).toBeGreaterThanOrEqual(before + 60_000);
      expect(result!.getTime()).toBeLessThanOrEqual(after + 60_000);
    });

    it('schedules a retry with correct interval for attempt 2 using standard policy', async () => {
      const before = Date.now();
      const result = await manager.scheduleRetry(
        'notif-1',
        DeliveryChannel.EMAIL,
        2,
        STANDARD_RETRY_POLICY
      );

      expect(result).not.toBeNull();
      // 5 minutes = 300_000 ms
      expect(result!.getTime()).toBeGreaterThanOrEqual(before + 300_000);
    });

    it('schedules a retry with correct interval for attempt 3 using standard policy', async () => {
      const before = Date.now();
      const result = await manager.scheduleRetry(
        'notif-1',
        DeliveryChannel.SMS,
        3,
        STANDARD_RETRY_POLICY
      );

      expect(result).not.toBeNull();
      // 15 minutes = 900_000 ms
      expect(result!.getTime()).toBeGreaterThanOrEqual(before + 900_000);
    });

    it('returns null when attempt exceeds max attempts for standard policy', async () => {
      const result = await manager.scheduleRetry(
        'notif-1',
        DeliveryChannel.EMAIL,
        4,
        STANDARD_RETRY_POLICY
      );

      expect(result).toBeNull();
    });

    it('schedules webhook retries with correct intervals', async () => {
      const before = Date.now();

      const r1 = await manager.scheduleRetry('notif-2', DeliveryChannel.WEBHOOK, 1, WEBHOOK_RETRY_POLICY);
      const r2 = await manager.scheduleRetry('notif-2', DeliveryChannel.WEBHOOK, 2, WEBHOOK_RETRY_POLICY);
      const r3 = await manager.scheduleRetry('notif-2', DeliveryChannel.WEBHOOK, 3, WEBHOOK_RETRY_POLICY);
      const r4 = await manager.scheduleRetry('notif-2', DeliveryChannel.WEBHOOK, 4, WEBHOOK_RETRY_POLICY);
      const r5 = await manager.scheduleRetry('notif-2', DeliveryChannel.WEBHOOK, 5, WEBHOOK_RETRY_POLICY);

      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      expect(r3).not.toBeNull();
      expect(r4).not.toBeNull();
      expect(r5).not.toBeNull();

      // Verify exponential backoff intervals
      expect(r1!.getTime()).toBeGreaterThanOrEqual(before + 30_000);
      expect(r2!.getTime()).toBeGreaterThanOrEqual(before + 60_000);
      expect(r3!.getTime()).toBeGreaterThanOrEqual(before + 120_000);
      expect(r4!.getTime()).toBeGreaterThanOrEqual(before + 240_000);
      expect(r5!.getTime()).toBeGreaterThanOrEqual(before + 480_000);
    });

    it('returns null when attempt exceeds max attempts for webhook policy', async () => {
      const result = await manager.scheduleRetry(
        'notif-2',
        DeliveryChannel.WEBHOOK,
        6,
        WEBHOOK_RETRY_POLICY
      );

      expect(result).toBeNull();
    });

    it('adds the retry entry to pending retries', async () => {
      await manager.scheduleRetry('notif-3', DeliveryChannel.EMAIL, 1, STANDARD_RETRY_POLICY);

      const pending = manager.getPendingRetries();
      expect(pending).toHaveLength(1);
      expect(pending[0].notificationId).toBe('notif-3');
      expect(pending[0].channel).toBe(DeliveryChannel.EMAIL);
      expect(pending[0].attemptNumber).toBe(1);
    });

    it('does not add to pending when max attempts exhausted', async () => {
      await manager.scheduleRetry('notif-4', DeliveryChannel.EMAIL, 4, STANDARD_RETRY_POLICY);

      expect(manager.getPendingRetries()).toHaveLength(0);
    });
  });

  describe('processRetries()', () => {
    it('processes due retries and calls delivery function', async () => {
      // Schedule a retry in the past (already due)
      manager.getPendingRetries(); // just to confirm empty
      const pastTime = new Date(Date.now() - 1000);
      // Directly add a past-due retry for testing
      (manager as any).pendingRetries.push({
        notificationId: 'notif-5',
        channel: DeliveryChannel.EMAIL,
        attemptNumber: 1,
        scheduledTime: pastTime,
        policy: STANDARD_RETRY_POLICY,
      });

      await manager.processRetries();

      expect(deliveryFn).toHaveBeenCalledWith('notif-5', DeliveryChannel.EMAIL, 1);
    });

    it('does not process retries that are not yet due', async () => {
      const futureTime = new Date(Date.now() + 999_999);
      (manager as any).pendingRetries.push({
        notificationId: 'notif-6',
        channel: DeliveryChannel.SMS,
        attemptNumber: 1,
        scheduledTime: futureTime,
        policy: STANDARD_RETRY_POLICY,
      });

      await manager.processRetries();

      expect(deliveryFn).not.toHaveBeenCalled();
      expect(manager.getPendingRetries()).toHaveLength(1);
    });

    it('schedules next retry when delivery fails', async () => {
      (deliveryFn as any).mockResolvedValue(false);
      const pastTime = new Date(Date.now() - 1000);
      (manager as any).pendingRetries.push({
        notificationId: 'notif-7',
        channel: DeliveryChannel.EMAIL,
        attemptNumber: 1,
        scheduledTime: pastTime,
        policy: STANDARD_RETRY_POLICY,
      });

      await manager.processRetries();

      // Should have scheduled attempt 2
      const pending = manager.getPendingRetries();
      expect(pending).toHaveLength(1);
      expect(pending[0].attemptNumber).toBe(2);
      expect(pending[0].notificationId).toBe('notif-7');
    });

    it('marks as permanently failed when all retries exhausted', async () => {
      (deliveryFn as any).mockResolvedValue(false);
      const pastTime = new Date(Date.now() - 1000);
      (manager as any).pendingRetries.push({
        notificationId: 'notif-8',
        channel: DeliveryChannel.EMAIL,
        attemptNumber: 3, // last attempt for standard policy
        scheduledTime: pastTime,
        policy: STANDARD_RETRY_POLICY,
      });

      await manager.processRetries();

      // Should have marked as permanently failed (attempt 4 > maxAttempts=3)
      const failures = manager.getPermanentFailures();
      expect(failures).toHaveLength(1);
      expect(failures[0].notificationId).toBe('notif-8');
      expect(failures[0].channel).toBe(DeliveryChannel.EMAIL);
      expect(failures[0].reason).toContain('3 retry attempts exhausted');
    });

    it('removes successful retries from the pending list', async () => {
      (deliveryFn as any).mockResolvedValue(true);
      const pastTime = new Date(Date.now() - 1000);
      (manager as any).pendingRetries.push({
        notificationId: 'notif-9',
        channel: DeliveryChannel.WEBHOOK,
        attemptNumber: 2,
        scheduledTime: pastTime,
        policy: WEBHOOK_RETRY_POLICY,
      });

      await manager.processRetries();

      expect(manager.getPendingRetries()).toHaveLength(0);
      expect(manager.getPermanentFailures()).toHaveLength(0);
    });

    it('processes multiple due retries independently', async () => {
      let callCount = 0;
      (deliveryFn as any).mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1); // first succeeds, second fails
      });

      const pastTime = new Date(Date.now() - 1000);
      (manager as any).pendingRetries.push(
        {
          notificationId: 'notif-a',
          channel: DeliveryChannel.EMAIL,
          attemptNumber: 1,
          scheduledTime: pastTime,
          policy: STANDARD_RETRY_POLICY,
        },
        {
          notificationId: 'notif-b',
          channel: DeliveryChannel.SMS,
          attemptNumber: 1,
          scheduledTime: pastTime,
          policy: STANDARD_RETRY_POLICY,
        }
      );

      await manager.processRetries();

      expect(deliveryFn).toHaveBeenCalledTimes(2);
      // notif-b failed, so it should be rescheduled as attempt 2
      const pending = manager.getPendingRetries();
      expect(pending).toHaveLength(1);
      expect(pending[0].notificationId).toBe('notif-b');
      expect(pending[0].attemptNumber).toBe(2);
    });
  });

  describe('markPermanentlyFailed()', () => {
    it('records the permanent failure with reason', async () => {
      await manager.markPermanentlyFailed(
        'notif-10',
        DeliveryChannel.WEBHOOK,
        'All 5 retry attempts exhausted'
      );

      const failures = manager.getPermanentFailures();
      expect(failures).toHaveLength(1);
      expect(failures[0].notificationId).toBe('notif-10');
      expect(failures[0].channel).toBe(DeliveryChannel.WEBHOOK);
      expect(failures[0].reason).toBe('All 5 retry attempts exhausted');
      expect(failures[0].failedAt).toBeInstanceOf(Date);
    });

    it('records multiple permanent failures', async () => {
      await manager.markPermanentlyFailed('notif-11', DeliveryChannel.EMAIL, 'Provider down');
      await manager.markPermanentlyFailed('notif-12', DeliveryChannel.SMS, 'Invalid number');

      const failures = manager.getPermanentFailures();
      expect(failures).toHaveLength(2);
    });
  });

  describe('webhook retry policy — 5 attempts with permanent failure', () => {
    it('marks permanently failed after 5th webhook attempt fails', async () => {
      (deliveryFn as any).mockResolvedValue(false);
      const pastTime = new Date(Date.now() - 1000);
      (manager as any).pendingRetries.push({
        notificationId: 'wh-notif-1',
        channel: DeliveryChannel.WEBHOOK,
        attemptNumber: 5, // last attempt for webhook policy
        scheduledTime: pastTime,
        policy: WEBHOOK_RETRY_POLICY,
      });

      await manager.processRetries();

      const failures = manager.getPermanentFailures();
      expect(failures).toHaveLength(1);
      expect(failures[0].notificationId).toBe('wh-notif-1');
      expect(failures[0].reason).toContain('5 retry attempts exhausted');
      expect(manager.getPendingRetries()).toHaveLength(0);
    });
  });
});
