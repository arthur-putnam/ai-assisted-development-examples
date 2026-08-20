// Core type definitions for Order Notifications

export {
    OrderEventType,
    OrderEvent,
    OrderItem,
    OrderPlacedPayload,
    OrderShippedPayload,
    DeliveryEstimatePayload,
    OrderDeliveredPayload,
    OrderCancelledPayload,
} from './events.js';
export type { OrderEventPayload } from './events.js';

export {
    DeliveryChannel,
    DeliveryStatus,
} from './channels.js';
export type { DeliveryResult, ChannelDeliveryResult } from './channels.js';

export type {
    NotificationPreference,
    ChannelPreference,
    UpdateResult,
} from './preferences.js';

export type {
    NotificationContent,
    NotificationLogEntry,
    PaginatedResult,
} from './notifications.js';

export {
    STANDARD_RETRY_POLICY,
    WEBHOOK_RETRY_POLICY,
} from './retry.js';
export type { RetryPolicy } from './retry.js';

export type { IdempotencyRecord } from './idempotency.js';

export type { WebhookEndpoint, VerificationResult } from './webhooks.js';
