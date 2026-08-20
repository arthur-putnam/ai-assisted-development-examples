import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNotificationLog } from './notification-log.js';
import {
  DeliveryChannel,
  DeliveryStatus,
  OrderEventType,
  type NotificationLogEntry,
} from '../types/index.js';

function createEntry(overrides: Partial<NotificationLogEntry> = {}): NotificationLogEntry {
  return {
    id: 'entry-1',
    notificationId: 'notif-1',
    orderId: 'order-1',
    customerId: 'cust-1',
    eventType: OrderEventType.ORDER_PLACED,
    channel: DeliveryChannel.EMAIL,
    status: DeliveryStatus.PENDING,
    contentSummary: 'Order confirmation for order-1',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    attemptNumber: 1,
    idempotencyKey: 'ORDER_PLACED:order-1',
    ...overrides,
  };
}

describe('InMemoryNotificationLog', () => {
  let log: InMemoryNotificationLog;

  beforeEach(() => {
    log = new InMemoryNotificationLog();
  });

  describe('logAttempt', () => {
    it('should persist a PENDING entry before delivery', async () => {
      const entry = createEntry();
      await log.logAttempt(entry);

      const entries = log.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].status).toBe(DeliveryStatus.PENDING);
      expect(entries[0].id).toBe('entry-1');
    });

    it('should store multiple entries', async () => {
      await log.logAttempt(createEntry({ id: 'entry-1' }));
      await log.logAttempt(createEntry({ id: 'entry-2', channel: DeliveryChannel.SMS }));

      const entries = log.getEntries();
      expect(entries).toHaveLength(2);
    });

    it('should store a copy of the entry (no mutation)', async () => {
      const entry = createEntry();
      await log.logAttempt(entry);

      entry.status = DeliveryStatus.DELIVERED;
      const stored = log.getEntries();
      expect(stored[0].status).toBe(DeliveryStatus.PENDING);
    });
  });

  describe('updateStatus', () => {
    it('should update status to DELIVERED', async () => {
      await log.logAttempt(createEntry({ id: 'entry-1' }));
      await log.updateStatus('entry-1', DeliveryStatus.DELIVERED);

      const entries = log.getEntries();
      expect(entries[0].status).toBe(DeliveryStatus.DELIVERED);
    });

    it('should update status to FAILED with error message', async () => {
      await log.logAttempt(createEntry({ id: 'entry-1' }));
      await log.updateStatus('entry-1', DeliveryStatus.FAILED, 'Provider timeout');

      const entries = log.getEntries();
      expect(entries[0].status).toBe(DeliveryStatus.FAILED);
      expect(entries[0].errorMessage).toBe('Provider timeout');
    });

    it('should not throw for non-existent entry ID', async () => {
      await expect(
        log.updateStatus('non-existent', DeliveryStatus.DELIVERED)
      ).resolves.toBeUndefined();
    });

    it('should only update the targeted entry', async () => {
      await log.logAttempt(createEntry({ id: 'entry-1' }));
      await log.logAttempt(createEntry({ id: 'entry-2' }));
      await log.updateStatus('entry-1', DeliveryStatus.DELIVERED);

      const entries = log.getEntries();
      expect(entries[0].status).toBe(DeliveryStatus.DELIVERED);
      expect(entries[1].status).toBe(DeliveryStatus.PENDING);
    });
  });

  describe('queryByOrder', () => {
    it('should return empty result for non-existent order', async () => {
      const result = await log.queryByOrder('non-existent-order', 1);

      expect(result.entries).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.page).toBe(1);
      expect(result.hasNextPage).toBe(false);
    });

    it('should filter entries by order ID', async () => {
      await log.logAttempt(createEntry({ id: 'e1', orderId: 'order-1' }));
      await log.logAttempt(createEntry({ id: 'e2', orderId: 'order-2' }));
      await log.logAttempt(createEntry({ id: 'e3', orderId: 'order-1' }));

      const result = await log.queryByOrder('order-1', 1);
      expect(result.entries).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.entries.every((e) => e.orderId === 'order-1')).toBe(true);
    });

    it('should sort by timestamp descending', async () => {
      await log.logAttempt(
        createEntry({ id: 'e1', timestamp: new Date('2024-01-01T10:00:00Z') })
      );
      await log.logAttempt(
        createEntry({ id: 'e2', timestamp: new Date('2024-01-03T10:00:00Z') })
      );
      await log.logAttempt(
        createEntry({ id: 'e3', timestamp: new Date('2024-01-02T10:00:00Z') })
      );

      const result = await log.queryByOrder('order-1', 1);
      expect(result.entries[0].id).toBe('e2');
      expect(result.entries[1].id).toBe('e3');
      expect(result.entries[2].id).toBe('e1');
    });

    it('should paginate results with default page size of 50', async () => {
      // Insert 55 entries
      for (let i = 0; i < 55; i++) {
        await log.logAttempt(
          createEntry({
            id: `entry-${i}`,
            timestamp: new Date(Date.now() - i * 1000),
          })
        );
      }

      const page1 = await log.queryByOrder('order-1', 1);
      expect(page1.entries).toHaveLength(50);
      expect(page1.totalCount).toBe(55);
      expect(page1.hasNextPage).toBe(true);
      expect(page1.pageSize).toBe(50);
      expect(page1.nextPageToken).toBe('2');

      const page2 = await log.queryByOrder('order-1', 2);
      expect(page2.entries).toHaveLength(5);
      expect(page2.totalCount).toBe(55);
      expect(page2.hasNextPage).toBe(false);
      expect(page2.nextPageToken).toBeUndefined();
    });

    it('should cap page size at 50', async () => {
      for (let i = 0; i < 60; i++) {
        await log.logAttempt(
          createEntry({
            id: `entry-${i}`,
            timestamp: new Date(Date.now() - i * 1000),
          })
        );
      }

      const result = await log.queryByOrder('order-1', 1, 100);
      expect(result.entries).toHaveLength(50);
      expect(result.pageSize).toBe(50);
    });

    it('should support custom page size smaller than max', async () => {
      for (let i = 0; i < 15; i++) {
        await log.logAttempt(
          createEntry({
            id: `entry-${i}`,
            timestamp: new Date(Date.now() - i * 1000),
          })
        );
      }

      const result = await log.queryByOrder('order-1', 1, 10);
      expect(result.entries).toHaveLength(10);
      expect(result.pageSize).toBe(10);
      expect(result.hasNextPage).toBe(true);
    });

    it('should handle page number less than 1 by treating as page 1', async () => {
      await log.logAttempt(createEntry({ id: 'e1' }));

      const result = await log.queryByOrder('order-1', 0);
      expect(result.page).toBe(1);
      expect(result.entries).toHaveLength(1);
    });
  });

  describe('logDuplicate', () => {
    it('should record a skipped duplicate attempt', async () => {
      const originalTimestamp = new Date('2024-01-15T10:00:00Z');
      await log.logDuplicate('ORDER_PLACED:order-1', originalTimestamp);

      const duplicates = log.getDuplicates();
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].idempotencyKey).toBe('ORDER_PLACED:order-1');
      expect(duplicates[0].originalDeliveryTimestamp).toEqual(originalTimestamp);
      expect(duplicates[0].id).toBeDefined();
      expect(duplicates[0].skippedAt).toBeInstanceOf(Date);
    });

    it('should record multiple duplicate attempts', async () => {
      await log.logDuplicate('ORDER_PLACED:order-1', new Date('2024-01-15T10:00:00Z'));
      await log.logDuplicate('ORDER_PLACED:order-1', new Date('2024-01-15T10:00:00Z'));

      const duplicates = log.getDuplicates();
      expect(duplicates).toHaveLength(2);
    });
  });

  describe('write-ahead pattern', () => {
    it('should allow logging PENDING then updating to DELIVERED', async () => {
      const entry = createEntry({ id: 'wa-1', status: DeliveryStatus.PENDING });
      await log.logAttempt(entry);

      // Verify PENDING exists before delivery
      const beforeDelivery = log.getEntries();
      expect(beforeDelivery[0].status).toBe(DeliveryStatus.PENDING);

      // Simulate delivery success
      await log.updateStatus('wa-1', DeliveryStatus.DELIVERED);

      const afterDelivery = log.getEntries();
      expect(afterDelivery[0].status).toBe(DeliveryStatus.DELIVERED);
    });

    it('should allow logging PENDING then updating to FAILED with reason', async () => {
      const entry = createEntry({ id: 'wa-2', status: DeliveryStatus.PENDING });
      await log.logAttempt(entry);

      await log.updateStatus('wa-2', DeliveryStatus.FAILED, 'Connection refused');

      const entries = log.getEntries();
      expect(entries[0].status).toBe(DeliveryStatus.FAILED);
      expect(entries[0].errorMessage).toBe('Connection refused');
    });
  });
});
