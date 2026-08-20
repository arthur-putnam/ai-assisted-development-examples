/**
 * Event Consumer - Consumes order events from a message queue and dispatches
 * them to the Notification Engine for processing.
 *
 * Handles deserialization of raw messages, validates basic event structure,
 * and gracefully skips malformed events with logging.
 *
 * Requirements: 1.1, 2.1, 2.3, 3.1, 4.1
 */

import { OrderEventType } from '../types/index.js';
import type { OrderEvent } from '../types/index.js';
import type { NotificationEngine } from '../engine/notification-engine.js';

/**
 * Interface representing an abstract message queue.
 * Allows the consumer to subscribe with a handler that processes raw messages.
 */
export interface MessageQueue {
  subscribe(handler: (rawEvent: string) => Promise<void>): void;
}

/**
 * Logger interface for consumer operations.
 */
export interface EventConsumerLogger {
  error(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
}

/**
 * Default console-based logger implementation.
 */
const defaultLogger: EventConsumerLogger = {
  error(message: string, context?: Record<string, unknown>): void {
    console.error(message, context);
  },
  info(message: string, context?: Record<string, unknown>): void {
    console.info(message, context);
  },
};

/**
 * Interface for the Event Consumer.
 * Subscribes to a message queue and dispatches events to the Notification Engine.
 */
export interface EventConsumer {
  /** Subscribe to order events from the message queue */
  subscribe(): void;

  /** Handle an incoming order event */
  handleEvent(event: OrderEvent): Promise<void>;

  /** Handle a raw message string from the queue (deserialize + validate + dispatch) */
  handleRawMessage(raw: string): Promise<void>;
}

/** Set of valid event types for quick lookup */
const VALID_EVENT_TYPES = new Set<string>(Object.values(OrderEventType));

/**
 * Validates that a parsed object has the required structure of an OrderEvent.
 * Returns true if all required fields are present with correct types.
 */
function isValidOrderEvent(obj: unknown): obj is OrderEvent {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  const event = obj as Record<string, unknown>;

  if (typeof event.eventId !== 'string' || event.eventId.length === 0) {
    return false;
  }

  if (typeof event.eventType !== 'string' || !VALID_EVENT_TYPES.has(event.eventType)) {
    return false;
  }

  if (typeof event.orderId !== 'string' || event.orderId.length === 0) {
    return false;
  }

  if (typeof event.customerId !== 'string' || event.customerId.length === 0) {
    return false;
  }

  if (event.timestamp === undefined || event.timestamp === null) {
    return false;
  }

  if (event.payload === undefined || event.payload === null || typeof event.payload !== 'object') {
    return false;
  }

  return true;
}

/**
 * Default implementation of the EventConsumer.
 * Connects to a message queue, deserializes events, and dispatches to the NotificationEngine.
 */
export class DefaultEventConsumer implements EventConsumer {
  private readonly messageQueue: MessageQueue;
  private readonly notificationEngine: NotificationEngine;
  private readonly logger: EventConsumerLogger;

  constructor(
    messageQueue: MessageQueue,
    notificationEngine: NotificationEngine,
    logger: EventConsumerLogger = defaultLogger
  ) {
    this.messageQueue = messageQueue;
    this.notificationEngine = notificationEngine;
    this.logger = logger;
  }

  /**
   * Subscribe to the message queue.
   * Registers a handler that processes each raw message through handleRawMessage.
   */
  subscribe(): void {
    this.messageQueue.subscribe((rawEvent: string) => this.handleRawMessage(rawEvent));
    this.logger.info('EventConsumer subscribed to message queue');
  }

  /**
   * Handle a validated OrderEvent by dispatching it to the NotificationEngine.
   */
  async handleEvent(event: OrderEvent): Promise<void> {
    await this.notificationEngine.processEvent(event);
  }

  /**
   * Handle a raw message string from the queue.
   * Deserializes the JSON, validates the event structure, and dispatches to the engine.
   * On failure (malformed JSON, missing fields), logs the error and skips the message.
   */
  async handleRawMessage(raw: string): Promise<void> {
    let parsed: unknown;

    // Step 1: Attempt JSON deserialization
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      this.logger.error('Failed to deserialize event: invalid JSON', {
        raw: raw.substring(0, 200),
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    // Step 2: Validate required event structure
    if (!isValidOrderEvent(parsed)) {
      this.logger.error('Failed to validate event: missing or invalid required fields', {
        raw: raw.substring(0, 200),
      });
      return;
    }

    // Step 3: Normalize timestamp (JSON.parse produces a string for dates)
    const event: OrderEvent = {
      ...parsed,
      timestamp: new Date(parsed.timestamp as unknown as string),
    };

    // Step 4: Dispatch to NotificationEngine
    try {
      await this.handleEvent(event);
    } catch (error) {
      this.logger.error('Error processing event in NotificationEngine', {
        eventId: event.eventId,
        eventType: event.eventType,
        orderId: event.orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
