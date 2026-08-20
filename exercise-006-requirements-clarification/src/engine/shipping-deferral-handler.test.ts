import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultShippingDeferralHandler } from './shipping-deferral-handler.js';
import { OrderEventType } from '../types/index.js';
import type { OrderEvent, OrderShippedPayload } from '../types/index.js';

function makeShippedEvent(overrides: Partial<OrderShippedPayload> = {}): OrderEvent {
  const payload: OrderShippedPayload = {
    orderId: 'order-123',
    carrierName: null,
    trackingNumber: null,
    ...overrides,
  };

  return {
    eventId: 'evt-1',
    eventType: OrderEventType.ORDER_SHIPPED,
    orderId: payload.orderId,
    customerId: 'cust-1',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    payload,
  };
}

describe('DefaultShippingDeferralHandler', () => {
  let releaseFn: ReturnType<typeof vi.fn>;
  let currentTime: Date;
  let handler: DefaultShippingDeferralHandler;

  beforeEach(() => {
    releaseFn = vi.fn().mockResolvedValue(undefined);
    currentTime = new Date('2024-01-01T00:00:00Z');
    handler = new DefaultShippingDeferralHandler(releaseFn, () => currentTime);
  });

  describe('handleShippedEvent', () => {
    it('releases immediately when both carrier and tracking are present', async () => {
      const event = makeShippedEvent({
        carrierName: 'FedEx',
        trackingNumber: 'TRK-123',
      });

      await handler.handleShippedEvent(event);

      expect(releaseFn).toHaveBeenCalledTimes(1);
      expect(releaseFn).toHaveBeenCalledWith(event);
      expect(handler.deferredCount).toBe(0);
    });

    it('defers when carrier is missing', async () => {
      const event = makeShippedEvent({
        carrierName: null,
        trackingNumber: 'TRK-123',
      });

      await handler.handleShippedEvent(event);

      expect(releaseFn).not.toHaveBeenCalled();
      expect(handler.deferredCount).toBe(1);
      expect(handler.hasDeferredNotification('order-123')).toBe(true);
    });

    it('defers when tracking number is missing', async () => {
      const event = makeShippedEvent({
        carrierName: 'UPS',
        trackingNumber: null,
      });

      await handler.handleShippedEvent(event);

      expect(releaseFn).not.toHaveBeenCalled();
      expect(handler.deferredCount).toBe(1);
    });

    it('defers when both carrier and tracking are missing', async () => {
      const event = makeShippedEvent({
        carrierName: null,
        trackingNumber: null,
      });

      await handler.handleShippedEvent(event);

      expect(releaseFn).not.toHaveBeenCalled();
      expect(handler.deferredCount).toBe(1);
    });

    it('ignores non-ORDER_SHIPPED events', async () => {
      const event: OrderEvent = {
        eventId: 'evt-2',
        eventType: OrderEventType.ORDER_PLACED,
        orderId: 'order-123',
        customerId: 'cust-1',
        timestamp: new Date('2024-01-01T00:00:00Z'),
        payload: {
          orderId: 'order-123',
          orderTotal: 100,
          items: [],
        },
      };

      await handler.handleShippedEvent(event);

      expect(releaseFn).not.toHaveBeenCalled();
      expect(handler.deferredCount).toBe(0);
    });
  });

  describe('processDeferredNotifications', () => {
    it('releases deferred notification when data becomes complete', async () => {
      const event = makeShippedEvent({
        carrierName: null,
        trackingNumber: null,
      });

      await handler.handleShippedEvent(event);
      expect(handler.deferredCount).toBe(1);

      // Update with carrier and tracking
      handler.updateDeferredEvent('order-123', 'FedEx', 'TRK-456');

      await handler.processDeferredNotifications();

      expect(releaseFn).toHaveBeenCalledTimes(1);
      const releasedEvent = releaseFn.mock.calls[0][0] as OrderEvent;
      const releasedPayload = releasedEvent.payload as OrderShippedPayload;
      expect(releasedPayload.carrierName).toBe('FedEx');
      expect(releasedPayload.trackingNumber).toBe('TRK-456');
      expect(handler.deferredCount).toBe(0);
    });

    it('releases deferred notification after 10-minute timeout with partial data', async () => {
      const event = makeShippedEvent({
        carrierName: 'UPS',
        trackingNumber: null,
      });

      await handler.handleShippedEvent(event);

      // Advance time by 10 minutes
      currentTime = new Date('2024-01-01T00:10:00Z');

      await handler.processDeferredNotifications();

      expect(releaseFn).toHaveBeenCalledTimes(1);
      const releasedEvent = releaseFn.mock.calls[0][0] as OrderEvent;
      const releasedPayload = releasedEvent.payload as OrderShippedPayload;
      expect(releasedPayload.carrierName).toBe('UPS');
      expect(releasedPayload.trackingNumber).toBeNull();
      expect(handler.deferredCount).toBe(0);
    });

    it('does not release before timeout when data is still incomplete', async () => {
      const event = makeShippedEvent({
        carrierName: null,
        trackingNumber: null,
      });

      await handler.handleShippedEvent(event);

      // Advance time by 5 minutes (less than timeout)
      currentTime = new Date('2024-01-01T00:05:00Z');

      await handler.processDeferredNotifications();

      expect(releaseFn).not.toHaveBeenCalled();
      expect(handler.deferredCount).toBe(1);
    });

    it('releases notification with whatever data is available at timeout', async () => {
      const event = makeShippedEvent({
        carrierName: null,
        trackingNumber: null,
      });

      await handler.handleShippedEvent(event);

      // Only carrier updated, tracking still missing
      handler.updateDeferredEvent('order-123', 'DHL', null);

      // Advance past timeout
      currentTime = new Date('2024-01-01T00:10:01Z');

      await handler.processDeferredNotifications();

      expect(releaseFn).toHaveBeenCalledTimes(1);
      const releasedEvent = releaseFn.mock.calls[0][0] as OrderEvent;
      const releasedPayload = releasedEvent.payload as OrderShippedPayload;
      expect(releasedPayload.carrierName).toBe('DHL');
      expect(releasedPayload.trackingNumber).toBeNull();
    });

    it('handles multiple deferred notifications independently', async () => {
      const event1 = makeShippedEvent({ orderId: 'order-1', carrierName: null, trackingNumber: null });
      event1.orderId = 'order-1';
      const event2 = makeShippedEvent({ orderId: 'order-2', carrierName: null, trackingNumber: null });
      event2.orderId = 'order-2';

      await handler.handleShippedEvent(event1);
      await handler.handleShippedEvent(event2);
      expect(handler.deferredCount).toBe(2);

      // Complete data for order-1 only
      handler.updateDeferredEvent('order-1', 'FedEx', 'TRK-1');

      await handler.processDeferredNotifications();

      expect(releaseFn).toHaveBeenCalledTimes(1);
      const releasedEvent = releaseFn.mock.calls[0][0] as OrderEvent;
      expect(releasedEvent.orderId).toBe('order-1');
      expect(handler.deferredCount).toBe(1);
      expect(handler.hasDeferredNotification('order-2')).toBe(true);
    });
  });

  describe('updateDeferredEvent', () => {
    it('updates carrier name for deferred notification', async () => {
      const event = makeShippedEvent({ carrierName: null, trackingNumber: null });
      await handler.handleShippedEvent(event);

      handler.updateDeferredEvent('order-123', 'UPS', null);

      // Process — still incomplete, should not release (within timeout)
      await handler.processDeferredNotifications();
      expect(releaseFn).not.toHaveBeenCalled();
    });

    it('updates tracking number for deferred notification', async () => {
      const event = makeShippedEvent({ carrierName: null, trackingNumber: null });
      await handler.handleShippedEvent(event);

      handler.updateDeferredEvent('order-123', null, 'TRK-789');

      // Still incomplete
      await handler.processDeferredNotifications();
      expect(releaseFn).not.toHaveBeenCalled();
    });

    it('completing both fields triggers release on next process call', async () => {
      const event = makeShippedEvent({ carrierName: null, trackingNumber: null });
      await handler.handleShippedEvent(event);

      handler.updateDeferredEvent('order-123', 'FedEx', 'TRK-999');

      await handler.processDeferredNotifications();
      expect(releaseFn).toHaveBeenCalledTimes(1);
    });

    it('does nothing for unknown order IDs', async () => {
      handler.updateDeferredEvent('unknown-order', 'FedEx', 'TRK-123');
      expect(handler.deferredCount).toBe(0);
    });

    it('preserves existing non-null values when update provides null', async () => {
      const event = makeShippedEvent({ carrierName: 'UPS', trackingNumber: null });
      await handler.handleShippedEvent(event);

      // Update with null carrier — should keep existing UPS
      handler.updateDeferredEvent('order-123', null, 'TRK-555');

      await handler.processDeferredNotifications();

      expect(releaseFn).toHaveBeenCalledTimes(1);
      const releasedEvent = releaseFn.mock.calls[0][0] as OrderEvent;
      const releasedPayload = releasedEvent.payload as OrderShippedPayload;
      expect(releasedPayload.carrierName).toBe('UPS');
      expect(releasedPayload.trackingNumber).toBe('TRK-555');
    });
  });
});
