/**
 * Delivery channel types and result definitions.
 * Defines the supported notification channels and their delivery outcomes.
 */

/** Supported notification delivery channels */
export enum DeliveryChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WEBHOOK = 'WEBHOOK',
}

/** Possible statuses of a delivery attempt */
export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

/** Result of delivering a notification to a specific channel */
export interface DeliveryResult {
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attemptTimestamp: Date;
  errorMessage?: string;
}

/** Result returned by a channel adapter after attempting delivery */
export interface ChannelDeliveryResult {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
}
