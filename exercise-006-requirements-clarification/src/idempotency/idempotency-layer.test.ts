import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryIdempotencyLayer } from './idempotency-layer.js';
import { OrderEventType } from '../types/index.js';

describe('InMemoryIdempotencyLayer', () => {
  let layer: InMemoryIdempotencyLayer;

  beforeEach(() => {
    layer = new InMemoryIdempotencyLayer();
  });

  describe('generateKey', () => {
    it('should produce deterministic keys from eventType and orderId', () => {
      const key = layer.generateKey(OrderEventType.ORDER_PLACED, 'order-123');
      expect(key).toBe('ORDER_PLACED:order-123');
    });

    it('should produce different keys for different event types', () => {
      const key1 = layer.generateKey(OrderEventType.ORDER_PLACED, 'order-123');
      const key2 = layer.generateKey(OrderEventType.ORDER_SHIPPED, 'order-123');
      expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different order IDs', () => {
      const key1 = layer.generateKey(OrderEventType.ORDER_PLACED, 'order-123');
      const key2 = layer.generateKey(OrderEventType.ORDER_PLACED, 'order-456');
      expect(key1).not.toBe(key2);
    });

    it('should produce the same key for identical inputs', () => {
      const key1 = layer.generateKey(OrderEventType.ORDER_DELIVERED, 'abc');
      const key2 = layer.generateKey(OrderEventType.ORDER_DELIVERED, 'abc');
      expect(key1).toBe(key2);
    });
  });

  describe('canDeliver', () => {
    it('should return true when no prior record exists', async () => {
      const result = await layer.canDeliver('ORDER_PLACED:order-999');
      expect(result).toBe(true);
    });

    it('should return false when delivered within 24 hours', async () => {
      const key = 'ORDER_PLACED:order-123';
      const now = new Date();
      await layer.recordDelivery(key, now);

      const result = await layer.canDeliver(key);
      expect(result).toBe(false);
    });

    it('should return true when delivery was more than 24 hours ago', async () => {
      const key = 'ORDER_PLACED:order-123';
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      await layer.recordDelivery(key, twentyFiveHoursAgo);

      const result = await layer.canDeliver(key);
      expect(result).toBe(true);
    });

    it('should return true when prior delivery failed (Req 10.3)', async () => {
      const key = 'ORDER_SHIPPED:order-456';
      layer.setRecord(key, {
        key,
        notificationId: key,
        status: 'failed',
        deliveredAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const result = await layer.canDeliver(key);
      expect(result).toBe(true);
    });

    it('should return true when prior status is unknown (Req 10.4)', async () => {
      const key = 'ORDER_DELIVERED:order-789';
      layer.setRecord(key, {
        key,
        notificationId: key,
        status: 'unknown',
        deliveredAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const result = await layer.canDeliver(key);
      expect(result).toBe(true);
    });

    it('should return false when delivered exactly at the 24-hour boundary', async () => {
      const key = 'ORDER_PLACED:order-boundary';
      // Delivered just under 24 hours ago
      const justUnder24h = new Date(Date.now() - (24 * 60 * 60 * 1000 - 1000));
      await layer.recordDelivery(key, justUnder24h);

      const result = await layer.canDeliver(key);
      expect(result).toBe(false);
    });
  });

  describe('recordDelivery', () => {
    it('should persist a delivery record with correct status and expiry', async () => {
      const key = 'ORDER_PLACED:order-123';
      const timestamp = new Date('2024-01-15T10:00:00Z');

      await layer.recordDelivery(key, timestamp);

      const record = layer.getRecord(key);
      expect(record).toBeDefined();
      expect(record!.status).toBe('delivered');
      expect(record!.deliveredAt).toEqual(timestamp);
      expect(record!.expiresAt).toEqual(
        new Date(timestamp.getTime() + 24 * 60 * 60 * 1000)
      );
    });

    it('should overwrite a failed record on redelivery', async () => {
      const key = 'ORDER_SHIPPED:order-456';
      layer.setRecord(key, {
        key,
        notificationId: key,
        status: 'failed',
        deliveredAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const now = new Date();
      await layer.recordDelivery(key, now);

      const record = layer.getRecord(key);
      expect(record!.status).toBe('delivered');
      expect(record!.deliveredAt).toEqual(now);
    });
  });

  describe('logDuplicateAttempt', () => {
    it('should log a duplicate attempt with key and original timestamp', async () => {
      const key = 'ORDER_PLACED:order-123';
      const originalTimestamp = new Date('2024-01-15T10:00:00Z');

      await layer.logDuplicateAttempt(key, originalTimestamp);

      const log = layer.getDuplicateLog();
      expect(log).toHaveLength(1);
      expect(log[0].key).toBe(key);
      expect(log[0].originalTimestamp).toEqual(originalTimestamp);
      expect(log[0].attemptedAt).toBeInstanceOf(Date);
    });

    it('should accumulate multiple duplicate attempts', async () => {
      const key = 'ORDER_CANCELLED:order-789';
      const ts1 = new Date('2024-01-15T10:00:00Z');
      const ts2 = new Date('2024-01-15T11:00:00Z');

      await layer.logDuplicateAttempt(key, ts1);
      await layer.logDuplicateAttempt(key, ts2);

      const log = layer.getDuplicateLog();
      expect(log).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should remove all records and logs', async () => {
      const key = 'ORDER_PLACED:order-123';
      await layer.recordDelivery(key, new Date());
      await layer.logDuplicateAttempt(key, new Date());

      layer.clear();

      expect(await layer.canDeliver(key)).toBe(true);
      expect(layer.getDuplicateLog()).toHaveLength(0);
    });
  });
});
