/**
 * Delivery Router implementation.
 * Routes assembled notifications to appropriate channel adapters independently.
 * Failure in one channel does not block or delay delivery to others.
 */

import {
  DeliveryChannel,
  DeliveryStatus,
  NotificationContent,
  RetryPolicy,
  STANDARD_RETRY_POLICY,
  WEBHOOK_RETRY_POLICY,
} from '../types/index.js';
import type { DeliveryResult, ChannelDeliveryResult } from '../types/index.js';
import type { ChannelAdapter } from '../adapters/email-adapter.js';
import type { RetryManager } from '../retry/retry-manager.js';

/**
 * Interface for the Delivery Router.
 * Delivers notifications to specified channels independently.
 */
export interface DeliveryRouter {
  deliver(
    notification: NotificationContent,
    channels: DeliveryChannel[],
    customerId: string
  ): Promise<DeliveryResult[]>;
}

/**
 * Default implementation of the DeliveryRouter.
 * Uses Promise.allSettled to ensure channel independence — a failure in one
 * channel does not prevent or delay delivery to other channels.
 */
export class DefaultDeliveryRouter implements DeliveryRouter {
  private readonly adapters: Map<DeliveryChannel, ChannelAdapter>;
  private readonly retryManager: RetryManager | null;

  constructor(
    adapters: Map<DeliveryChannel, ChannelAdapter>,
    retryManager: RetryManager | null = null
  ) {
    this.adapters = adapters;
    this.retryManager = retryManager;
  }

  /**
   * Deliver notification to all specified channels independently.
   * Uses Promise.allSettled so each channel is attempted regardless of others.
   */
  async deliver(
    notification: NotificationContent,
    channels: DeliveryChannel[],
    customerId: string
  ): Promise<DeliveryResult[]> {
    const deliveryPromises = channels.map((channel) =>
      this.deliverToChannel(notification, channel, customerId)
    );

    const settledResults = await Promise.allSettled(deliveryPromises);

    return settledResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      // If the promise itself rejected (unexpected), record as failed
      const channel = channels[index];
      return {
        channel,
        status: DeliveryStatus.FAILED,
        attemptTimestamp: new Date(),
        errorMessage: result.reason instanceof Error
          ? result.reason.message
          : 'Unexpected delivery error',
      };
    });
  }

  /**
   * Deliver notification to a single channel via its adapter.
   * On failure, schedules a retry via the RetryManager if available.
   */
  private async deliverToChannel(
    notification: NotificationContent,
    channel: DeliveryChannel,
    customerId: string
  ): Promise<DeliveryResult> {
    const adapter = this.adapters.get(channel);
    const attemptTimestamp = new Date();

    if (!adapter) {
      return {
        channel,
        status: DeliveryStatus.FAILED,
        attemptTimestamp,
        errorMessage: `No adapter configured for channel: ${channel}`,
      };
    }

    const adapterResult: ChannelDeliveryResult = await adapter.send(customerId, notification);

    if (adapterResult.success) {
      return {
        channel,
        status: DeliveryStatus.DELIVERED,
        attemptTimestamp,
      };
    }

    // Delivery failed — schedule retry if RetryManager is available
    if (this.retryManager) {
      const policy = this.getRetryPolicy(channel);
      const notificationId = (notification.metadata?.notificationId as string) ?? 'unknown';
      await this.retryManager.scheduleRetry(notificationId, channel, 1, policy);
    }

    return {
      channel,
      status: DeliveryStatus.FAILED,
      attemptTimestamp,
      errorMessage: adapterResult.errorMessage,
    };
  }

  /**
   * Get the appropriate retry policy based on channel type.
   * Webhooks use a more aggressive retry schedule with 5 attempts.
   */
  private getRetryPolicy(channel: DeliveryChannel): RetryPolicy {
    if (channel === DeliveryChannel.WEBHOOK) {
      return WEBHOOK_RETRY_POLICY;
    }
    return STANDARD_RETRY_POLICY;
  }
}
