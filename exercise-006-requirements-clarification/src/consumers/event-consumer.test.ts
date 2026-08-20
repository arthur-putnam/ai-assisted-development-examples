/**
 * Unit tests for the Event Consumer.
 * Tests deserialization, validation, dispatch, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultEventConsumer } from './event-consumer.js';
import type { MessageQueue, EventConsumerLogger } from './event-consumer.js';
import { OrderEventType } from '../types/index.js';
import type { OrderEvent } from '../types/index.js';
import type { NotificationEngine } from '../engine/notification-engine.js';

// --- Mock factories ---

function createMockMessageQueue(): MessageQueue {
  return {
    subscribe: vi.fn(),
  };
}

function createMockNotificationEngine(): NotificationEngine {
  return {
    processEvent: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockLogger(): EventConsumerLogger {
  return {
    error: vi.fn(),
    info: vi.fn(),
  };
}

function createValidEvent(): OrderEvent {
  return {
    eventId: 'evt-001',
    eventType: OrderEventType.ORDER_PLACED,
    orderId: 'order-123',
    customerId: 'cust-456',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    payload: {
      orderId: 'order-123',
      orderTotal: 99.99,
      items: [{ itemName: 'Widget', quantity: 2, unitPrice: 49.99 }],
    },
  };
}

function createValidEventJson(): string {
  return JSON.stringify({
    eventId: 'evt-001',
    eventType: 'ORDER_PLACED',
    orderId: 'order-123',
    customerId: 'cust-456',
    timestamp: '2024-01-15T10:00:00.000Z',
    payload: {
      orderId: 'order-123',
      orderTotal: 99.99,
      items: [{ itemName: 'Widget', quantity: 2, unitPrice: 49.99 }],
    },
  });
}

describe('DefaultEventConsumer', () => {
  let messageQueue: MessageQueue;
  let notificationEngine: NotificationEngine;
  let logger: EventConsumerLogger;
  let consumer: DefaultEventConsumer;

  beforeEach(() => {
    messageQueue = createMockMessageQueue();
    notificationEngine = createMockNotificationEngine();
    logger = createMockLogger();
    consumer = new DefaultEventConsumer(messageQueue, notificationEngine, logger);
  });

  describe('subscribe()', () => {
    it('should register a handler with the message queue', () => {
      consumer.subscribe();

      expect(messageQueue.subscribe).toHaveBeenCalledTimes(1);
      expect(messageQueue.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should log that subscription was successful', () => {
      consumer.subscribe();

      expect(logger.info).toHaveBeenCalledWith('EventConsumer subscribed to message queue');
    });
  });

  describe('handleEvent()', () => {
    it('should dispatch a valid OrderEvent to the NotificationEngine', async () => {
      const event = createValidEvent();

      await consumer.handleEvent(event);

      expect(notificationEngine.processEvent).toHaveBeenCalledTimes(1);
      expect(notificationEngine.processEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('handleRawMessage()', () => {
    it('should deserialize a valid JSON event and dispatch to the engine', async () => {
      const rawJson = createValidEventJson();

      await consumer.handleRawMessage(rawJson);

      expect(notificationEngine.processEvent).toHaveBeenCalledTimes(1);
      const dispatchedEvent = (notificationEngine.processEvent as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(dispatchedEvent.eventId).toBe('evt-001');
      expect(dispatchedEvent.eventType).toBe(OrderEventType.ORDER_PLACED);
      expect(dispatchedEvent.orderId).toBe('order-123');
      expect(dispatchedEvent.customerId).toBe('cust-456');
      expect(dispatchedEvent.timestamp).toBeInstanceOf(Date);
    });

    it('should handle all valid event types', async () => {
      for (const eventType of Object.values(OrderEventType)) {
        const raw = JSON.stringify({
          eventId: `evt-${eventType}`,
          eventType,
          orderId: 'order-abc',
          customerId: 'cust-xyz',
          timestamp: '2024-01-15T10:00:00.000Z',
          payload: { orderId: 'order-abc' },
        });

        await consumer.handleRawMessage(raw);
      }

      expect(notificationEngine.processEvent).toHaveBeenCalledTimes(
        Object.values(OrderEventType).length
      );
    });

    describe('deserialization errors', () => {
      it('should log and skip invalid JSON', async () => {
        await consumer.handleRawMessage('not valid json {{{');

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to deserialize event: invalid JSON',
          expect.objectContaining({ raw: expect.any(String) })
        );
      });

      it('should log and skip empty string', async () => {
        await consumer.handleRawMessage('');

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('validation errors', () => {
      it('should skip event with missing eventId', async () => {
        const raw = JSON.stringify({
          eventType: 'ORDER_PLACED',
          orderId: 'order-123',
          customerId: 'cust-456',
          timestamp: '2024-01-15T10:00:00.000Z',
          payload: { orderId: 'order-123' },
        });

        await consumer.handleRawMessage(raw);

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to validate event: missing or invalid required fields',
          expect.any(Object)
        );
      });

      it('should skip event with empty eventId', async () => {
        const raw = JSON.stringify({
          eventId: '',
          eventType: 'ORDER_PLACED',
          orderId: 'order-123',
          customerId: 'cust-456',
          timestamp: '2024-01-15T10:00:00.000Z',
          payload: { orderId: 'order-123' },
        });

        await consumer.handleRawMessage(raw);

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
      });

      it('should skip event with invalid eventType', async () => {
        const raw = JSON.stringify({
          eventId: 'evt-001',
          eventType: 'INVALID_TYPE',
          orderId: 'order-123',
          customerId: 'cust-456',
          timestamp: '2024-01-15T10:00:00.000Z',
          payload: { orderId: 'order-123' },
        });

        await consumer.handleRawMessage(raw);

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to validate event: missing or invalid required fields',
          expect.any(Object)
        );
      });

      it('should skip event with missing orderId', async () => {
        const raw = JSON.stringify({
          eventId: 'evt-001',
          eventType: 'ORDER_PLACED',
          customerId: 'cust-456',
          timestamp: '2024-01-15T10:00:00.000Z',
          payload: { orderId: 'order-123' },
        });

        await consumer.handleRawMessage(raw);

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
      });

      it('should skip event with missing customerId', async () => {
        const raw = JSON.stringify({
          eventId: 'evt-001',
          eventType: 'ORDER_PLACED',
          orderId: 'order-123',
          timestamp: '2024-01-15T10:00:00.000Z',
          payload: { orderId: 'order-123' },
        });

        await consumer.handleRawMessage(raw);

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
      });

      it('should skip event with missing timestamp', async () => {
        const raw = JSON.stringify({
          eventId: 'evt-001',
          eventType: 'ORDER_PLACED',
          orderId: 'order-123',
          customerId: 'cust-456',
          payload: { orderId: 'order-123' },
        });

        await consumer.handleRawMessage(raw);

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
      });

      it('should skip event with missing payload', async () => {
        const raw = JSON.stringify({
          eventId: 'evt-001',
          eventType: 'ORDER_PLACED',
          orderId: 'order-123',
          customerId: 'cust-456',
          timestamp: '2024-01-15T10:00:00.000Z',
        });

        await consumer.handleRawMessage(raw);

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
      });

      it('should skip event with null payload', async () => {
        const raw = JSON.stringify({
          eventId: 'evt-001',
          eventType: 'ORDER_PLACED',
          orderId: 'order-123',
          customerId: 'cust-456',
          timestamp: '2024-01-15T10:00:00.000Z',
          payload: null,
        });

        await consumer.handleRawMessage(raw);

        expect(notificationEngine.processEvent).not.toHaveBeenCalled();
      });
    });

    describe('engine processing errors', () => {
      it('should catch and log errors from NotificationEngine without throwing', async () => {
        (notificationEngine.processEvent as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Engine processing failed')
        );

        const rawJson = createValidEventJson();

        // Should not throw
        await expect(consumer.handleRawMessage(rawJson)).resolves.toBeUndefined();

        expect(logger.error).toHaveBeenCalledWith(
          'Error processing event in NotificationEngine',
          expect.objectContaining({
            eventId: 'evt-001',
            eventType: 'ORDER_PLACED',
            orderId: 'order-123',
            error: 'Engine processing failed',
          })
        );
      });
    });

    describe('subscribe + handleRawMessage integration', () => {
      it('should process messages received via subscribe handler', async () => {
        let capturedHandler: ((raw: string) => Promise<void>) | undefined;
        (messageQueue.subscribe as ReturnType<typeof vi.fn>).mockImplementation(
          (handler: (raw: string) => Promise<void>) => {
            capturedHandler = handler;
          }
        );

        consumer.subscribe();

        expect(capturedHandler).toBeDefined();

        const rawJson = createValidEventJson();
        await capturedHandler!(rawJson);

        expect(notificationEngine.processEvent).toHaveBeenCalledTimes(1);
      });
    });
  });
});
