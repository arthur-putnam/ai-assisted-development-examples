/**
 * Retry policy definitions.
 * Defines retry behavior for failed notification deliveries.
 */

/** Configuration for how delivery retries are scheduled */
export interface RetryPolicy {
  maxAttempts: number;
  /** Intervals in milliseconds between retry attempts */
  intervals: number[];
}

/** Standard retry: 3 attempts at 1 minute, 5 minutes, 15 minutes */
export const STANDARD_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  intervals: [60_000, 300_000, 900_000],
};

/** Webhook retry: 5 attempts with exponential backoff starting at 30 seconds */
export const WEBHOOK_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  intervals: [30_000, 60_000, 120_000, 240_000, 480_000],
};
