/**
 * Idempotency tracking types.
 * Prevents duplicate notification delivery for the same order event.
 */

/**
 * Tracks whether a notification has already been delivered.
 * Key format: `${eventType}:${orderId}`
 * Entries expire 24 hours after successful delivery.
 */
export interface IdempotencyRecord {
  key: string;
  notificationId: string;
  status: 'delivered' | 'failed' | 'unknown';
  deliveredAt: Date | null;
  expiresAt: Date;
}
