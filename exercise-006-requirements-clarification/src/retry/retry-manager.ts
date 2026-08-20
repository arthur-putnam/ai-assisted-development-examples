/**
 * Retry Manager implementation.
 * Manages retry scheduling with exponential backoff for failed notification deliveries.
 * Supports both standard (email/SMS) and webhook retry policies.
 */

import { DeliveryChannel } from '../types/index.js';
import type { RetryPolicy, NotificationContent } from '../types/index.js';

/** Function signature for re-attempting delivery during retry processing */
export type RetryDeliveryFn = (
  notificationId: string,
  channel: DeliveryChannel,
  attemptNumber: number
) => Promise<boolean>;

/** A pending retry entry in the queue */
export interface PendingRetry {
  notificationId: string;
  channel: DeliveryChannel;
  attemptNumber: number;
  scheduledTime: Date;
  policy: RetryPolicy;
}

/** A permanent failure record */
export interface PermanentFailureRecord {
  notificationId: string;
  channel: DeliveryChannel;
  reason: string;
  failedAt: Date;
}

/**
 * Interface for the Retry Manager.
 */
export interface RetryManager {
  scheduleRetry(
    notificationId: string,
    channel: DeliveryChannel,
    attemptNumber: number,
    policy: RetryPolicy
  ): Promise<Date | null>;

  processRetries(): Promise<void>;

  markPermanentlyFailed(
    notificationId: string,
    channel: DeliveryChannel,
    reason: string
  ): Promise<void>;
}

/**
 * In-memory implementation of the RetryManager.
 * Schedules retries based on policy intervals and processes them when due.
 */
export class InMemoryRetryManager implements RetryManager {
  private pendingRetries: PendingRetry[] = [];
  private permanentFailures: PermanentFailureRecord[] = [];
  private deliveryFn: RetryDeliveryFn;

  constructor(deliveryFn: RetryDeliveryFn) {
    this.deliveryFn = deliveryFn;
  }

  /**
   * Schedule a retry for a failed delivery attempt.
   * Calculates the next retry time as now + intervals[attemptNumber - 1].
   * Returns null if attemptNumber exceeds maxAttempts (retries exhausted).
   */
  async scheduleRetry(
    notificationId: string,
    channel: DeliveryChannel,
    attemptNumber: number,
    policy: RetryPolicy
  ): Promise<Date | null> {
    // If attempt number exceeds max attempts, no more retries
    if (attemptNumber > policy.maxAttempts) {
      return null;
    }

    // Calculate the scheduled time: now + interval for this attempt
    const intervalMs = policy.intervals[attemptNumber - 1];
    const scheduledTime = new Date(Date.now() + intervalMs);

    this.pendingRetries.push({
      notificationId,
      channel,
      attemptNumber,
      scheduledTime,
      policy,
    });

    return scheduledTime;
  }

  /**
   * Process pending retries that are due (scheduledTime <= now).
   * Re-attempts delivery for each due retry.
   * On failure, schedules the next retry or marks as permanently failed.
   */
  async processRetries(): Promise<void> {
    const now = new Date();

    // Find retries that are due
    const dueRetries = this.pendingRetries.filter(
      (r) => r.scheduledTime.getTime() <= now.getTime()
    );

    // Remove due retries from the pending list
    this.pendingRetries = this.pendingRetries.filter(
      (r) => r.scheduledTime.getTime() > now.getTime()
    );

    for (const retry of dueRetries) {
      const success = await this.deliveryFn(
        retry.notificationId,
        retry.channel,
        retry.attemptNumber
      );

      if (!success) {
        // Schedule next retry or mark as permanently failed
        const nextAttempt = retry.attemptNumber + 1;
        const nextScheduled = await this.scheduleRetry(
          retry.notificationId,
          retry.channel,
          nextAttempt,
          retry.policy
        );

        if (nextScheduled === null) {
          await this.markPermanentlyFailed(
            retry.notificationId,
            retry.channel,
            `All ${retry.policy.maxAttempts} retry attempts exhausted`
          );
        }
      }
    }
  }

  /**
   * Mark a notification delivery as permanently failed.
   * Records the failure with the given reason.
   */
  async markPermanentlyFailed(
    notificationId: string,
    channel: DeliveryChannel,
    reason: string
  ): Promise<void> {
    this.permanentFailures.push({
      notificationId,
      channel,
      reason,
      failedAt: new Date(),
    });
  }

  // --- Test helpers (not part of the interface) ---

  /** Get all pending retries (useful for testing) */
  getPendingRetries(): PendingRetry[] {
    return [...this.pendingRetries];
  }

  /** Get all permanent failure records (useful for testing) */
  getPermanentFailures(): PermanentFailureRecord[] {
    return [...this.permanentFailures];
  }

  /** Clear all state (useful for test cleanup) */
  clear(): void {
    this.pendingRetries = [];
    this.permanentFailures = [];
  }
}
