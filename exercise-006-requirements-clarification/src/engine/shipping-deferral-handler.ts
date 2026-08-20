/**
 * Shipping Deferral Handler - Manages deferred shipping notifications.
 *
 * When an ORDER_SHIPPED event arrives without carrier or tracking info,
 * the notification is deferred for up to 10 minutes. Once both values
 * are available or the timeout elapses, the notification is released
 * with whatever data is available at that time.
 *
 * Requirements: 2.5
 */

import type { OrderEvent } from '../types/index.js';
import { OrderEventType } from '../types/index.js';
import type { OrderShippedPayload } from '../types/index.js';

/** Maximum deferral time in milliseconds (10 minutes) */
const DEFERRAL_TIMEOUT_MS = 10 * 60 * 1000;

/** Record tracking a deferred shipping notification */
export interface DeferredShippingRecord {
  orderId: string;
  event: OrderEvent;
  deferredAt: Date;
  expiresAt: Date;
  carrierName: string | null;
  trackingNumber: string | null;
}

/** Callback function invoked to release/send a notification */
export type NotificationReleaseFn = (event: OrderEvent) => Promise<void>;

/** Interface for the shipping deferral handler */
export interface ShippingDeferralHandler {
  /** Handle a shipped event, deferring if carrier or tracking is missing */
  handleShippedEvent(event: OrderEvent): Promise<void>;

  /** Check deferred notifications and release those that are ready */
  processDeferredNotifications(): Promise<void>;

  /** Update deferred event data when new carrier/tracking info arrives */
  updateDeferredEvent(
    orderId: string,
    carrierName: string | null,
    trackingNumber: string | null
  ): void;
}

/** Default implementation of ShippingDeferralHandler */
export class DefaultShippingDeferralHandler implements ShippingDeferralHandler {
  private readonly deferredQueue: Map<string, DeferredShippingRecord> = new Map();
  private readonly releaseFn: NotificationReleaseFn;
  private readonly getNow: () => Date;

  constructor(releaseFn: NotificationReleaseFn, getNow: () => Date = () => new Date()) {
    this.releaseFn = releaseFn;
    this.getNow = getNow;
  }

  async handleShippedEvent(event: OrderEvent): Promise<void> {
    if (event.eventType !== OrderEventType.ORDER_SHIPPED) {
      return;
    }

    const payload = event.payload as OrderShippedPayload;

    // If both carrier and tracking are present, release immediately
    if (payload.carrierName !== null && payload.trackingNumber !== null) {
      await this.releaseFn(event);
      return;
    }

    // Otherwise defer the notification
    const now = this.getNow();
    const record: DeferredShippingRecord = {
      orderId: event.orderId,
      event,
      deferredAt: now,
      expiresAt: new Date(now.getTime() + DEFERRAL_TIMEOUT_MS),
      carrierName: payload.carrierName,
      trackingNumber: payload.trackingNumber,
    };

    this.deferredQueue.set(event.orderId, record);
  }

  async processDeferredNotifications(): Promise<void> {
    const now = this.getNow();

    for (const [orderId, record] of this.deferredQueue) {
      const dataComplete =
        record.carrierName !== null && record.trackingNumber !== null;
      const timedOut = now >= record.expiresAt;

      if (dataComplete || timedOut) {
        // Update the event payload with latest data before releasing
        const updatedEvent = this.buildUpdatedEvent(record);
        this.deferredQueue.delete(orderId);
        await this.releaseFn(updatedEvent);
      }
    }
  }

  updateDeferredEvent(
    orderId: string,
    carrierName: string | null,
    trackingNumber: string | null
  ): void {
    const record = this.deferredQueue.get(orderId);
    if (!record) {
      return;
    }

    if (carrierName !== null) {
      record.carrierName = carrierName;
    }
    if (trackingNumber !== null) {
      record.trackingNumber = trackingNumber;
    }
  }

  /** Builds an updated event with the latest carrier/tracking data */
  private buildUpdatedEvent(record: DeferredShippingRecord): OrderEvent {
    const originalPayload = record.event.payload as OrderShippedPayload;
    const updatedPayload: OrderShippedPayload = {
      ...originalPayload,
      carrierName: record.carrierName,
      trackingNumber: record.trackingNumber,
    };

    return {
      ...record.event,
      payload: updatedPayload,
    };
  }

  /** Get the number of currently deferred notifications (for testing) */
  get deferredCount(): number {
    return this.deferredQueue.size;
  }

  /** Check if an order has a deferred notification (for testing) */
  hasDeferredNotification(orderId: string): boolean {
    return this.deferredQueue.has(orderId);
  }
}
