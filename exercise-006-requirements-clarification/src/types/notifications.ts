/**
 * Notification content and logging types.
 * Defines the structure of assembled notifications and their audit trail.
 */

import { DeliveryChannel, DeliveryStatus } from './channels.js';
import { OrderEventType } from './events.js';

/** Assembled notification content ready for delivery */
export interface NotificationContent {
  subject: string;
  body: string;
  metadata: Record<string, unknown>;
}

/**
 * A single entry in the notification log.
 * Provides a complete audit trail of every delivery attempt.
 */
export interface NotificationLogEntry {
  id: string;
  notificationId: string;
  orderId: string;
  customerId: string;
  eventType: OrderEventType;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  contentSummary: string;
  timestamp: Date;
  attemptNumber: number;
  errorMessage?: string;
  idempotencyKey: string;
}

/**
 * A paginated result set for querying notification history.
 * Max 50 entries per page.
 */
export interface PaginatedResult<T> {
  entries: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  nextPageToken?: string;
}
