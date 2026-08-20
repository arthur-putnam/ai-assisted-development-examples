/**
 * Notification Engine - Core orchestration logic for the notification lifecycle.
 *
 * Wires together all components in the correct order:
 * IdempotencyLayer → PreferenceResolver → ContentAssembler → NotificationLog (write-ahead) → DeliveryRouter
 *
 * Handles shipping deferral by delegating ORDER_SHIPPED events to the
 * ShippingDeferralHandler when carrier or tracking information is missing.
 *
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.2, 8.3, 10.1, 10.2
 */

import { v4 as uuidv4 } from 'uuid';
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

/**
 * Interface for the Notification Engine.
 * Processes order events through the full notification lifecycle.
 */
export interface NotificationEngine {
  processEvent(event: OrderEvent): Promise<void>;
}

/**
 * Default implementation of the NotificationEngine.
 * Orchestrates the full notification lifecycle for each incoming order event.
 */
export class DefaultNotificationEngine implements NotificationEngine {
  private readonly idempotencyLayer: IdempotencyLayer;
  private readonly preferenceResolver: PreferenceResolver;
  private readonly contentAssembler: ContentAssembler;
  private readonly notificationLog: NotificationLog;
  private readonly deliveryRouter: DeliveryRouter;
  private readonly shippingDeferralHandler: ShippingDeferralHandler;

  constructor(
    idempotencyLayer: IdempotencyLayer,
    preferenceResolver: PreferenceResolver,
    contentAssembler: ContentAssembler,
    notificationLog: NotificationLog,
    deliveryRouter: DeliveryRouter,
    shippingDeferralHandler: ShippingDeferralHandler
  ) {
    this.idempotencyLayer = idempotencyLayer;
    this.preferenceResolver = preferenceResolver;
    this.contentAssembler = contentAssembler;
    this.notificationLog = notificationLog;
    this.deliveryRouter = deliveryRouter;
    this.shippingDeferralHandler = shippingDeferralHandler;
  }

  /**
   * Process an order event through the full notification lifecycle:
   * 1. Generate idempotency key
   * 2. Check if delivery is allowed (duplicate prevention)
   * 3. Resolve delivery channels from customer preferences
   * 4. Handle shipping deferral for ORDER_SHIPPED with missing data
   * 5. Assemble notification content
   * 6. Write-ahead log (PENDING) for each channel
   * 7. Deliver via DeliveryRouter
   * 8. Update log entries with delivery results
   * 9. Record delivery in IdempotencyLayer on success
   */
  async processEvent(event: OrderEvent): Promise<void> {
    // Step 1: Generate idempotency key
    const idempotencyKey = this.idempotencyLayer.generateKey(event.eventType, event.orderId);

    // Step 2: Check if delivery is allowed (Req 10.2)
    const canDeliver = await this.idempotencyLayer.canDeliver(idempotencyKey);
    if (!canDeliver) {
      // Duplicate — log and return
      await this.notificationLog.logDuplicate(idempotencyKey, new Date());
      await this.idempotencyLayer.logDuplicateAttempt(idempotencyKey, new Date());
      return;
    }

    // Step 3: Resolve channels from customer preferences
    const channels = await this.preferenceResolver.resolveChannels(
      event.customerId,
      event.eventType
    );

    // If no channels resolved (e.g., customer opted out), skip delivery
    if (channels.length === 0) {
      return;
    }

    // Step 4: Handle shipping deferral for ORDER_SHIPPED with missing carrier/tracking
    if (event.eventType === OrderEventType.ORDER_SHIPPED) {
      const payload = event.payload as OrderShippedPayload;
      if (payload.carrierName === null || payload.trackingNumber === null) {
        await this.shippingDeferralHandler.handleShippedEvent(event);
        return;
      }
    }

    // Step 5: Assemble notification content
    const content: NotificationContent = this.contentAssembler.assemble(
      event.eventType,
      event.payload
    );

    // Generate a unique notification ID for this delivery batch
    const notificationId = uuidv4();

    // Add notificationId to metadata for downstream components
    content.metadata.notificationId = notificationId;

    // Step 6: Write-ahead log — create PENDING entries for each channel
    const logEntries: NotificationLogEntry[] = channels.map((channel) => ({
      id: uuidv4(),
      notificationId,
      orderId: event.orderId,
      customerId: event.customerId,
      eventType: event.eventType,
      channel,
      status: DeliveryStatus.PENDING,
      contentSummary: content.subject,
      timestamp: new Date(),
      attemptNumber: 1,
      idempotencyKey,
    }));

    for (const entry of logEntries) {
      await this.notificationLog.logAttempt(entry);
    }

    // Step 7: Deliver via DeliveryRouter
    const deliveryResults: DeliveryResult[] = await this.deliveryRouter.deliver(
      content,
      channels,
      event.customerId
    );

    // Step 8: Update log entries with delivery results
    let hasSuccessfulDelivery = false;

    for (let i = 0; i < deliveryResults.length; i++) {
      const result = deliveryResults[i];
      const logEntry = logEntries[i];

      if (result.status === DeliveryStatus.DELIVERED) {
        await this.notificationLog.updateStatus(logEntry.id, DeliveryStatus.DELIVERED);
        hasSuccessfulDelivery = true;
      } else {
        await this.notificationLog.updateStatus(
          logEntry.id,
          DeliveryStatus.FAILED,
          result.errorMessage
        );
      }
    }

    // Step 9: Record delivery in IdempotencyLayer if at least one channel succeeded
    if (hasSuccessfulDelivery) {
      await this.idempotencyLayer.recordDelivery(idempotencyKey, new Date());
    }
  }
}
