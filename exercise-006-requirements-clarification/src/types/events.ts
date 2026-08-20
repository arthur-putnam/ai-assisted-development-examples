/**
 * Order event types and payload definitions.
 * Represents all lifecycle events an order can transition through.
 */

/** All supported order lifecycle event types */
export enum OrderEventType {
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  DELIVERY_ESTIMATE_UPDATED = 'DELIVERY_ESTIMATE_UPDATED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
}

/** A single item within an order */
export interface OrderItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
}

/** Payload for ORDER_PLACED events */
export interface OrderPlacedPayload {
  orderId: string;
  orderTotal: number;
  items: OrderItem[];
}

/** Payload for ORDER_SHIPPED events */
export interface OrderShippedPayload {
  orderId: string;
  carrierName: string | null;
  trackingNumber: string | null;
}

/** Payload for DELIVERY_ESTIMATE_UPDATED events */
export interface DeliveryEstimatePayload {
  orderId: string;
  carrierName: string;
  trackingNumber: string;
  estimatedDeliveryDate: Date;
}

/** Payload for ORDER_DELIVERED events */
export interface OrderDeliveredPayload {
  orderId: string;
  deliveryTimestamp: Date;
}

/** Payload for ORDER_CANCELLED events */
export interface OrderCancelledPayload {
  orderId: string;
  cancellationReason: string;
  refundAmount: number | null;
  estimatedRefundProcessingTime: string | null;
}

/** Union of all possible order event payloads */
export type OrderEventPayload =
  | OrderPlacedPayload
  | OrderShippedPayload
  | DeliveryEstimatePayload
  | OrderDeliveredPayload
  | OrderCancelledPayload;

/**
 * Represents a discrete order lifecycle event published by the Order Service.
 * Each event triggers notification processing through the Notification Engine.
 */
export interface OrderEvent {
  eventId: string;
  eventType: OrderEventType;
  orderId: string;
  customerId: string;
  timestamp: Date;
  payload: OrderEventPayload;
}
