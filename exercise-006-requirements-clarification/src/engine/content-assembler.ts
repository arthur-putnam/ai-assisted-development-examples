/**
 * Content Assembler - Assembles notification content based on order event type.
 * Produces human-readable subject/body and structured metadata for each event.
 */

import {
  OrderEventType,
  OrderPlacedPayload,
  OrderShippedPayload,
  DeliveryEstimatePayload,
  OrderDeliveredPayload,
  OrderCancelledPayload,
} from '../types/index.js';
import type { OrderEventPayload, NotificationContent } from '../types/index.js';

/** Interface for assembling notification content from order events */
export interface ContentAssembler {
  /**
   * Assemble notification content for a given event.
   * Ensures all required fields for the event type are included.
   */
  assemble(eventType: OrderEventType, payload: OrderEventPayload): NotificationContent;
}

/** Default implementation of ContentAssembler */
export class DefaultContentAssembler implements ContentAssembler {
  assemble(eventType: OrderEventType, payload: OrderEventPayload): NotificationContent {
    switch (eventType) {
      case OrderEventType.ORDER_PLACED:
        return this.assembleOrderPlaced(payload as OrderPlacedPayload);
      case OrderEventType.ORDER_SHIPPED:
        return this.assembleOrderShipped(payload as OrderShippedPayload);
      case OrderEventType.DELIVERY_ESTIMATE_UPDATED:
        return this.assembleDeliveryEstimate(payload as DeliveryEstimatePayload);
      case OrderEventType.ORDER_DELIVERED:
        return this.assembleOrderDelivered(payload as OrderDeliveredPayload);
      case OrderEventType.ORDER_CANCELLED:
        return this.assembleOrderCancelled(payload as OrderCancelledPayload);
    }
  }

  private assembleOrderPlaced(payload: OrderPlacedPayload): NotificationContent {
    const itemLines = payload.items
      .map((item) => `  - ${item.itemName} (x${item.quantity}) @ $${item.unitPrice.toFixed(2)}`)
      .join('\n');

    const subject = `Order Confirmation - #${payload.orderId}`;
    const body = [
      `Your order #${payload.orderId} has been placed successfully.`,
      ``,
      `Order Total: $${payload.orderTotal.toFixed(2)}`,
      ``,
      `Items:`,
      itemLines,
    ].join('\n');

    const metadata: Record<string, unknown> = {
      orderId: payload.orderId,
      orderTotal: payload.orderTotal,
      items: payload.items,
    };

    return { subject, body, metadata };
  }

  private assembleOrderShipped(payload: OrderShippedPayload): NotificationContent {
    const subject = `Order Shipped - #${payload.orderId}`;

    const bodyParts = [`Your order #${payload.orderId} has been shipped.`];
    if (payload.carrierName) {
      bodyParts.push(`Carrier: ${payload.carrierName}`);
    }
    if (payload.trackingNumber) {
      bodyParts.push(`Tracking Number: ${payload.trackingNumber}`);
    }

    const body = bodyParts.join('\n');

    const metadata: Record<string, unknown> = {
      orderId: payload.orderId,
      carrierName: payload.carrierName,
      trackingNumber: payload.trackingNumber,
    };

    return { subject, body, metadata };
  }

  private assembleDeliveryEstimate(payload: DeliveryEstimatePayload): NotificationContent {
    const estimatedDate = payload.estimatedDeliveryDate instanceof Date
      ? payload.estimatedDeliveryDate.toISOString()
      : String(payload.estimatedDeliveryDate);

    const subject = `Delivery Estimate Updated - #${payload.orderId}`;
    const body = [
      `Your order #${payload.orderId} has an updated delivery estimate.`,
      `Carrier: ${payload.carrierName}`,
      `Tracking Number: ${payload.trackingNumber}`,
      `Estimated Delivery: ${estimatedDate}`,
    ].join('\n');

    const metadata: Record<string, unknown> = {
      orderId: payload.orderId,
      carrierName: payload.carrierName,
      trackingNumber: payload.trackingNumber,
      estimatedDeliveryDate: payload.estimatedDeliveryDate,
    };

    return { subject, body, metadata };
  }

  private assembleOrderDelivered(payload: OrderDeliveredPayload): NotificationContent {
    const deliveryTime = payload.deliveryTimestamp instanceof Date
      ? payload.deliveryTimestamp.toISOString()
      : String(payload.deliveryTimestamp);

    const subject = `Order Delivered - #${payload.orderId}`;
    const body = [
      `Your order #${payload.orderId} has been delivered.`,
      `Delivered at: ${deliveryTime}`,
    ].join('\n');

    const metadata: Record<string, unknown> = {
      orderId: payload.orderId,
      deliveryTimestamp: payload.deliveryTimestamp,
    };

    return { subject, body, metadata };
  }

  private assembleOrderCancelled(payload: OrderCancelledPayload): NotificationContent {
    const subject = `Order Cancelled - #${payload.orderId}`;

    const bodyParts = [
      `Your order #${payload.orderId} has been cancelled.`,
      `Reason: ${payload.cancellationReason}`,
    ];

    if (payload.refundAmount !== null) {
      bodyParts.push(`Refund Amount: $${payload.refundAmount.toFixed(2)}`);
    }
    if (payload.estimatedRefundProcessingTime !== null) {
      bodyParts.push(`Estimated Refund Processing Time: ${payload.estimatedRefundProcessingTime}`);
    }

    const body = bodyParts.join('\n');

    const metadata: Record<string, unknown> = {
      orderId: payload.orderId,
      cancellationReason: payload.cancellationReason,
      refundAmount: payload.refundAmount,
      estimatedRefundProcessingTime: payload.estimatedRefundProcessingTime,
    };

    return { subject, body, metadata };
  }
}
