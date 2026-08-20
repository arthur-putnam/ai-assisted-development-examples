/**
 * Unit tests for the Notification Engine orchestration logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultNotificationEngine } from './notification-engine.js';
import {
  OrderEventType,
  DeliveryChannel,
  DeliveryStatus,
} from '../types/index.js';
import type {
  OrderEvent,
  OrderShippedPayload,
  NotificationContent,
  NotificationLogEntry,
  DeliveryResult,
} from '../types/index.js';
import type { IdempotencyLayer } from '../idempotency/idempotency-layer.js';
import type { PreferenceResolver } from '../preferences/preference-resolver.js';
import type { ContentAssembler } from './content-assembler.js';
import type { NotificationLog } from '../log/notification-log.js';
import type { DeliveryRouter } from './delivery-router.js';
import type { ShippingDeferralHandler } from './shipping-deferral-handler.js';

// --- Mock factories ---

function createMockIdempotencyLayer(): IdempotencyLayer {
  return {
    generateKey: vi.fn((eventType, orderId) => `${eventType}:${orderId}`),
    canDeliver: vi.fn().mockResolvedValue(true),
    recordDelivery: vi.fn().mockResolvedValue(undefined),
    logDuplicateAttempt: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockPreferenceResolver(): PreferenceResolver {
  return {
    resolveChannels: vi.fn().mockResolvedValue([DeliveryChannel.EMAIL]),
    getPreference: vi.fn().mockResolvedValue(null),
    updatePreference: vi.fn().mockResolvedValue({ success: true }),
  };
}

function createMockContentAssembler(): ContentAssembler {
  return {
    assemble: vi.fn().mockReturnValue({
      subject: 'Test Subject',
      body: 'Test Body',
      metadata: { orderId: 'order-1' },
    }),
  };
}

function createMockNotificationLog(): NotificationLog {
  return {
    logAttempt: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    queryByOrder: vi.fn().mockResolvedValue({
      entries: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
      hasNextPage: false,
    }),
    logDuplicate: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDeliveryRouter(): DeliveryRouter {
  return {
    deliver: vi.fn().mockResolvedValue([
      {
        channel: DeliveryChannel.EMAIL,
        status: DeliveryStatus.DELIVERED,
        attemptTimestamp: new Date(),
      },
    ]),
  };
}

function createMockShippingDeferralHandler(): ShippingDeferralHandler {
  return {
    handleShippedEvent: vi.fn().mockResolvedValue(undefined),
    processDeferredNotifications: vi.fn().mockResolvedValue(undefined),
    updateDeferredEvent: vi.fn(),
  };
}

function createOrderEvent(overrides?: Partial<OrderEvent>): OrderEvent {
  return {
    eventId: 'evt-1',
    eventType: OrderEventType.ORDER_PLACED,
    orderId: 'order-1',
    customerId: 'cust-1',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    payload: {
      orderId: 'order-1',
      orderTotal: 50.0,
      items: [{ itemName: 'Widget', quantity: 2, unitPrice: 25.0 }],
    },
    ...overrides,
  };
}

// --- Tests ---

describe('DefaultNotificationEngine', () => {
  let idempotencyLayer: IdempotencyLayer;
  let preferenceResolver: PreferenceResolver;
  let contentAssembler: ContentAssembler;
  let notificationLog: NotificationLog;
  let deliveryRouter: DeliveryRouter;
  let shippingDeferralHandler: ShippingDeferralHandler;
  let engine: DefaultNotificationEngine;

  beforeEach(() => {
    idempotencyLayer = createMockIdempotencyLayer();
    preferenceResolver = createMockPreferenceResolver();
    contentAssembler = createMockContentAssembler();
    notificationLog = createMockNotificationLog();
    deliveryRouter = createMockDeliveryRouter();
    shippingDeferralHandler = createMockShippingDeferralHandler();

    engine = new DefaultNotificationEngine(
      idempotencyLayer,
      preferenceResolver,
      contentAssembler,
      notificationLog,
      deliveryRouter,
      shippingDeferralHandler
    );
  });

  describe('processEvent - full lifecycle', () => {
    it('should process a standard event through the full lifecycle', async () => {
      const event = createOrderEvent();

      await engine.processEvent(event);

      // Step 1: Idempotency key generated
      expect(idempotencyLayer.generateKey).toHaveBeenCalledWith(
        OrderEventType.ORDER_PLACED,
        'order-1'
      );

      // Step 2: Delivery allowed check
      expect(idempotencyLayer.canDeliver).toHaveBeenCalledWith('ORDER_PLACED:order-1');

      // Step 3: Channels resolved
      expect(preferenceResolver.resolveChannels).toHaveBeenCalledWith('cust-1', OrderEventType.ORDER_PLACED);

      // Step 5: Content assembled
      expect(contentAssembler.assemble).toHaveBeenCalledWith(
        OrderEventType.ORDER_PLACED,
        event.payload
      );

      // Step 6: Write-ahead log
      expect(notificationLog.logAttempt).toHaveBeenCalledTimes(1);
      const loggedEntry = (notificationLog.logAttempt as ReturnType<typeof vi.fn>).mock.calls[0][0] as NotificationLogEntry;
      expect(loggedEntry.status).toBe(DeliveryStatus.PENDING);
      expect(loggedEntry.orderId).toBe('order-1');
      expect(loggedEntry.customerId).toBe('cust-1');
      expect(loggedEntry.eventType).toBe(OrderEventType.ORDER_PLACED);
      expect(loggedEntry.channel).toBe(DeliveryChannel.EMAIL);
      expect(loggedEntry.idempotencyKey).toBe('ORDER_PLACED:order-1');

      // Step 7: Delivery
      expect(deliveryRouter.deliver).toHaveBeenCalledTimes(1);

      // Step 8: Log updated
      expect(notificationLog.updateStatus).toHaveBeenCalledWith(
        loggedEntry.id,
        DeliveryStatus.DELIVERED
      );

      // Step 9: Idempotency recorded
      expect(idempotencyLayer.recordDelivery).toHaveBeenCalledWith(
        'ORDER_PLACED:order-1',
        expect.any(Date)
      );
    });

    it('should deliver to multiple channels independently', async () => {
      (preferenceResolver.resolveChannels as ReturnType<typeof vi.fn>).mockResolvedValue([
        DeliveryChannel.EMAIL,
        DeliveryChannel.SMS,
      ]);
      (deliveryRouter.deliver as ReturnType<typeof vi.fn>).mockResolvedValue([
        { channel: DeliveryChannel.EMAIL, status: DeliveryStatus.DELIVERED, attemptTimestamp: new Date() },
        { channel: DeliveryChannel.SMS, status: DeliveryStatus.DELIVERED, attemptTimestamp: new Date() },
      ]);

      const event = createOrderEvent();
      await engine.processEvent(event);

      // Two log entries created (one per channel)
      expect(notificationLog.logAttempt).toHaveBeenCalledTimes(2);

      // Both updated as delivered
      expect(notificationLog.updateStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('processEvent - duplicate prevention', () => {
    it('should skip delivery for duplicate events and log the duplicate', async () => {
      (idempotencyLayer.canDeliver as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const event = createOrderEvent();
      await engine.processEvent(event);

      // Should log duplicate
      expect(notificationLog.logDuplicate).toHaveBeenCalledWith(
        'ORDER_PLACED:order-1',
        expect.any(Date)
      );
      expect(idempotencyLayer.logDuplicateAttempt).toHaveBeenCalledWith(
        'ORDER_PLACED:order-1',
        expect.any(Date)
      );

      // Should NOT proceed with delivery
      expect(preferenceResolver.resolveChannels).not.toHaveBeenCalled();
      expect(contentAssembler.assemble).not.toHaveBeenCalled();
      expect(deliveryRouter.deliver).not.toHaveBeenCalled();
    });
  });

  describe('processEvent - empty channels', () => {
    it('should skip delivery when no channels are resolved', async () => {
      (preferenceResolver.resolveChannels as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const event = createOrderEvent({
        eventType: OrderEventType.ORDER_SHIPPED,
        payload: { orderId: 'order-1', carrierName: 'UPS', trackingNumber: 'T123' },
      });
      await engine.processEvent(event);

      // Should NOT proceed to content assembly or delivery
      expect(contentAssembler.assemble).not.toHaveBeenCalled();
      expect(deliveryRouter.deliver).not.toHaveBeenCalled();
      expect(notificationLog.logAttempt).not.toHaveBeenCalled();
    });
  });

  describe('processEvent - shipping deferral', () => {
    it('should defer ORDER_SHIPPED when carrier is missing', async () => {
      const event = createOrderEvent({
        eventType: OrderEventType.ORDER_SHIPPED,
        payload: { orderId: 'order-1', carrierName: null, trackingNumber: 'T123' },
      });

      await engine.processEvent(event);

      expect(shippingDeferralHandler.handleShippedEvent).toHaveBeenCalledWith(event);
      // Should NOT proceed to content assembly or delivery
      expect(contentAssembler.assemble).not.toHaveBeenCalled();
      expect(deliveryRouter.deliver).not.toHaveBeenCalled();
    });

    it('should defer ORDER_SHIPPED when tracking number is missing', async () => {
      const event = createOrderEvent({
        eventType: OrderEventType.ORDER_SHIPPED,
        payload: { orderId: 'order-1', carrierName: 'FedEx', trackingNumber: null },
      });

      await engine.processEvent(event);

      expect(shippingDeferralHandler.handleShippedEvent).toHaveBeenCalledWith(event);
      expect(contentAssembler.assemble).not.toHaveBeenCalled();
      expect(deliveryRouter.deliver).not.toHaveBeenCalled();
    });

    it('should defer ORDER_SHIPPED when both carrier and tracking are missing', async () => {
      const event = createOrderEvent({
        eventType: OrderEventType.ORDER_SHIPPED,
        payload: { orderId: 'order-1', carrierName: null, trackingNumber: null },
      });

      await engine.processEvent(event);

      expect(shippingDeferralHandler.handleShippedEvent).toHaveBeenCalledWith(event);
      expect(contentAssembler.assemble).not.toHaveBeenCalled();
    });

    it('should NOT defer ORDER_SHIPPED when both carrier and tracking are present', async () => {
      const event = createOrderEvent({
        eventType: OrderEventType.ORDER_SHIPPED,
        payload: { orderId: 'order-1', carrierName: 'UPS', trackingNumber: 'T123' },
      });

      await engine.processEvent(event);

      expect(shippingDeferralHandler.handleShippedEvent).not.toHaveBeenCalled();
      expect(contentAssembler.assemble).toHaveBeenCalled();
      expect(deliveryRouter.deliver).toHaveBeenCalled();
    });
  });

  describe('processEvent - delivery failure handling', () => {
    it('should update log with FAILED status when delivery fails', async () => {
      (deliveryRouter.deliver as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          channel: DeliveryChannel.EMAIL,
          status: DeliveryStatus.FAILED,
          attemptTimestamp: new Date(),
          errorMessage: 'Provider timeout',
        },
      ]);

      const event = createOrderEvent();
      await engine.processEvent(event);

      const loggedEntry = (notificationLog.logAttempt as ReturnType<typeof vi.fn>).mock.calls[0][0] as NotificationLogEntry;
      expect(notificationLog.updateStatus).toHaveBeenCalledWith(
        loggedEntry.id,
        DeliveryStatus.FAILED,
        'Provider timeout'
      );

      // Should NOT record delivery in idempotency layer when all fail
      expect(idempotencyLayer.recordDelivery).not.toHaveBeenCalled();
    });

    it('should record delivery if at least one channel succeeds', async () => {
      (preferenceResolver.resolveChannels as ReturnType<typeof vi.fn>).mockResolvedValue([
        DeliveryChannel.EMAIL,
        DeliveryChannel.SMS,
      ]);
      (deliveryRouter.deliver as ReturnType<typeof vi.fn>).mockResolvedValue([
        { channel: DeliveryChannel.EMAIL, status: DeliveryStatus.DELIVERED, attemptTimestamp: new Date() },
        { channel: DeliveryChannel.SMS, status: DeliveryStatus.FAILED, attemptTimestamp: new Date(), errorMessage: 'SMS failed' },
      ]);

      const event = createOrderEvent();
      await engine.processEvent(event);

      // Idempotency recorded because at least one channel succeeded
      expect(idempotencyLayer.recordDelivery).toHaveBeenCalledWith(
        'ORDER_PLACED:order-1',
        expect.any(Date)
      );
    });
  });

  describe('processEvent - write-ahead logging', () => {
    it('should log PENDING entries before delivery is attempted', async () => {
      // Track call order
      const callOrder: string[] = [];
      (notificationLog.logAttempt as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('logAttempt');
      });
      (deliveryRouter.deliver as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('deliver');
        return [
          { channel: DeliveryChannel.EMAIL, status: DeliveryStatus.DELIVERED, attemptTimestamp: new Date() },
        ];
      });

      const event = createOrderEvent();
      await engine.processEvent(event);

      // logAttempt should be called BEFORE deliver
      expect(callOrder.indexOf('logAttempt')).toBeLessThan(callOrder.indexOf('deliver'));
    });
  });

  describe('processEvent - content assembly', () => {
    it('should pass event type and payload to content assembler', async () => {
      const event = createOrderEvent({
        eventType: OrderEventType.ORDER_CANCELLED,
        payload: {
          orderId: 'order-1',
          cancellationReason: 'Out of stock',
          refundAmount: 50.0,
          estimatedRefundProcessingTime: '3-5 business days',
        },
      });

      await engine.processEvent(event);

      expect(contentAssembler.assemble).toHaveBeenCalledWith(
        OrderEventType.ORDER_CANCELLED,
        event.payload
      );
    });
  });
});
