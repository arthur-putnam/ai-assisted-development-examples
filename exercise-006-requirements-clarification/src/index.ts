/**
 * Order Notifications Service - Composition Root
 *
 * Factory function that wires all components together with dependency injection.
 * Accepts optional external providers; uses in-memory defaults when not provided.
 *
 * Requirements: All
 */

// --- Re-export types and interfaces for consumer convenience ---

export * from './types/index.js';

export type { IdempotencyLayer } from './idempotency/idempotency-layer.js';
export { InMemoryIdempotencyLayer } from './idempotency/idempotency-layer.js';

export type { PreferenceResolver } from './preferences/preference-resolver.js';
export { InMemoryPreferenceResolver, TRANSACTIONAL_EVENTS, NON_TRANSACTIONAL_EVENTS } from './preferences/preference-resolver.js';

export type { NotificationLog } from './log/notification-log.js';
export { InMemoryNotificationLog } from './log/notification-log.js';

export type { RetryManager } from './retry/retry-manager.js';
export { InMemoryRetryManager } from './retry/retry-manager.js';
export type { RetryDeliveryFn, PendingRetry, PermanentFailureRecord } from './retry/retry-manager.js';

export type { WebhookEndpointManager } from './webhooks/webhook-endpoint-manager.js';
export { InMemoryWebhookEndpointManager } from './webhooks/webhook-endpoint-manager.js';

export type { EventConsumer, MessageQueue, EventConsumerLogger } from './consumers/event-consumer.js';
export { DefaultEventConsumer } from './consumers/event-consumer.js';

export type { NotificationEngine } from './engine/notification-engine.js';
export { DefaultNotificationEngine } from './engine/notification-engine.js';

export type { ContentAssembler } from './engine/content-assembler.js';
export { DefaultContentAssembler } from './engine/content-assembler.js';

export type { DeliveryRouter } from './engine/delivery-router.js';
export { DefaultDeliveryRouter } from './engine/delivery-router.js';

export type { ShippingDeferralHandler } from './engine/shipping-deferral-handler.js';
export { DefaultShippingDeferralHandler } from './engine/shipping-deferral-handler.js';

export type { ChannelAdapter, EmailProviderClient } from './adapters/email-adapter.js';
export { EmailAdapter } from './adapters/email-adapter.js';

export type { SmsProviderClient } from './adapters/sms-adapter.js';
export { SmsAdapter } from './adapters/sms-adapter.js';

export type { HttpClient, WebhookEndpointResolver, WebhookAdapterInterface } from './adapters/webhook-adapter.js';
export { WebhookAdapter } from './adapters/webhook-adapter.js';

// --- Factory types and implementation ---

import { DeliveryChannel } from './types/index.js';
import { InMemoryIdempotencyLayer } from './idempotency/idempotency-layer.js';
import { InMemoryPreferenceResolver } from './preferences/preference-resolver.js';
import { DefaultContentAssembler } from './engine/content-assembler.js';
import { InMemoryNotificationLog } from './log/notification-log.js';
import { DefaultDeliveryRouter } from './engine/delivery-router.js';
import { DefaultShippingDeferralHandler } from './engine/shipping-deferral-handler.js';
import { DefaultNotificationEngine } from './engine/notification-engine.js';
import { InMemoryRetryManager } from './retry/retry-manager.js';
import { InMemoryWebhookEndpointManager } from './webhooks/webhook-endpoint-manager.js';
import { DefaultEventConsumer } from './consumers/event-consumer.js';
import { EmailAdapter } from './adapters/email-adapter.js';
import { SmsAdapter } from './adapters/sms-adapter.js';
import { WebhookAdapter } from './adapters/webhook-adapter.js';

import type { EmailProviderClient } from './adapters/email-adapter.js';
import type { SmsProviderClient } from './adapters/sms-adapter.js';
import type { HttpClient } from './adapters/webhook-adapter.js';
import type { MessageQueue, EventConsumerLogger } from './consumers/event-consumer.js';
import type { EventConsumer } from './consumers/event-consumer.js';
import type { NotificationEngine } from './engine/notification-engine.js';
import type { PreferenceResolver } from './preferences/preference-resolver.js';
import type { WebhookEndpointManager } from './webhooks/webhook-endpoint-manager.js';
import type { NotificationLog } from './log/notification-log.js';
import type { RetryManager } from './retry/retry-manager.js';
import type { ChannelAdapter } from './adapters/email-adapter.js';

/** Configuration options for the notification service factory */
export interface NotificationServiceConfig {
    /** Email provider client. If omitted, a no-op provider is used. */
    emailProvider?: EmailProviderClient;
    /** SMS provider client. If omitted, a no-op provider is used. */
    smsProvider?: SmsProviderClient;
    /** HTTP client for webhook delivery. If omitted, a no-op client is used. */
    httpClient?: HttpClient;
    /** Message queue for event consumption. If omitted, a no-op queue is used. */
    messageQueue?: MessageQueue;
    /** Logger for the event consumer. If omitted, console logging is used. */
    logger?: EventConsumerLogger;
}

/** The fully-wired notification service instance returned by the factory */
export interface NotificationService {
    eventConsumer: EventConsumer;
    notificationEngine: NotificationEngine;
    preferenceResolver: PreferenceResolver;
    webhookEndpointManager: WebhookEndpointManager;
    notificationLog: NotificationLog;
    retryManager: RetryManager;
}

/** No-op email provider for default in-memory usage */
const noopEmailProvider: EmailProviderClient = {
    async sendEmail() {
        return { statusCode: 200 };
    },
};

/** No-op SMS provider for default in-memory usage */
const noopSmsProvider: SmsProviderClient = {
    async sendSms() {
        return { statusCode: 200 };
    },
};

/** No-op HTTP client for default in-memory usage */
const noopHttpClient: HttpClient = {
    async post() {
        return { statusCode: 200 };
    },
};

/** No-op message queue for default in-memory usage */
const noopMessageQueue: MessageQueue = {
    subscribe() {
        // No-op: no real queue connected
    },
};

/**
 * Create a fully-wired NotificationService instance.
 *
 * All components are instantiated with proper dependency injection.
 * External providers (email, SMS, HTTP, message queue) can be injected
 * or will default to no-op in-memory implementations.
 */
export function createNotificationService(
    config: NotificationServiceConfig = {}
): NotificationService {
    const {
        emailProvider = noopEmailProvider,
        smsProvider = noopSmsProvider,
        httpClient = noopHttpClient,
        messageQueue = noopMessageQueue,
        logger,
    } = config;

    // --- Core data stores ---
    const idempotencyLayer = new InMemoryIdempotencyLayer();
    const preferenceResolver = new InMemoryPreferenceResolver();
    const notificationLog = new InMemoryNotificationLog();
    const contentAssembler = new DefaultContentAssembler();

    // --- Channel adapters ---
    const emailAdapter = new EmailAdapter(emailProvider);
    const smsAdapter = new SmsAdapter(smsProvider);

    // Webhook adapter needs an endpoint resolver that wraps the endpoint manager
    // We create the endpoint manager first, then use it as the resolver
    const webhookEndpointManager = new InMemoryWebhookEndpointManager(
        async (endpointUrl: string) => {
            const webhookAdapter = new WebhookAdapter(httpClient, {
                async getEndpoint() {
                    return null; // Not used during verification
                },
            });
            return webhookAdapter.verifyEndpoint(endpointUrl);
        }
    );

    // Webhook adapter with endpoint resolver that reads from the endpoint manager
    const webhookAdapter = new WebhookAdapter(httpClient, {
        async getEndpoint(customerId: string) {
            const endpoint = await webhookEndpointManager.getActiveEndpoint(customerId);
            if (!endpoint) return null;
            return { endpointUrl: endpoint.endpointUrl, secret: endpoint.secret };
        },
    });

    // --- Adapter map for the delivery router ---
    const adapters = new Map<DeliveryChannel, ChannelAdapter>([
        [DeliveryChannel.EMAIL, emailAdapter],
        [DeliveryChannel.SMS, smsAdapter],
        [DeliveryChannel.WEBHOOK, webhookAdapter],
    ]);

    // --- Retry manager (needs a delivery function) ---
    const retryManager = new InMemoryRetryManager(
        async (notificationId, channel, attemptNumber) => {
            // Re-attempt delivery for the given channel
            // In a real system this would look up the notification content from storage.
            // For the in-memory implementation, retries are tracked but delivery
            // re-attempt requires the original content which is not persisted here.
            // This placeholder returns false to indicate the retry infrastructure is wired.
            return false;
        }
    );

    // --- Delivery router ---
    const deliveryRouter = new DefaultDeliveryRouter(adapters, retryManager);

    // --- Shipping deferral handler ---
    // When a deferred notification is released, it goes back through the engine
    let notificationEngine: DefaultNotificationEngine;

    const shippingDeferralHandler = new DefaultShippingDeferralHandler(
        async (event) => {
            await notificationEngine.processEvent(event);
        }
    );

    // --- Notification engine (orchestrator) ---
    notificationEngine = new DefaultNotificationEngine(
        idempotencyLayer,
        preferenceResolver,
        contentAssembler,
        notificationLog,
        deliveryRouter,
        shippingDeferralHandler
    );

    // --- Event consumer ---
    const eventConsumer = new DefaultEventConsumer(
        messageQueue,
        notificationEngine,
        logger
    );

    return {
        eventConsumer,
        notificationEngine,
        preferenceResolver,
        webhookEndpointManager,
        notificationLog,
        retryManager,
    };
}
