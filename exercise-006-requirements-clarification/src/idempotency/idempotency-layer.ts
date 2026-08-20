/**
 * Idempotency Layer implementation.
 * Generates deterministic idempotency keys and enforces duplicate prevention.
 * Uses an in-memory store with TTL, designed to be replaceable with a database later.
 */

import { OrderEventType } from '../types/index.js';
import type { IdempotencyRecord } from '../types/index.js';

/** Duplicate attempt log entry */
export interface DuplicateAttemptLog {
  key: string;
  originalTimestamp: Date;
  attemptedAt: Date;
}

/**
 * Interface for the Idempotency Layer.
 */
export interface IdempotencyLayer {
  generateKey(eventType: OrderEventType, orderId: string): string;
  canDeliver(key: string): Promise<boolean>;
  recordDelivery(key: string, timestamp: Date): Promise<void>;
  logDuplicateAttempt(key: string, originalTimestamp: Date): Promise<void>;
}

/** 24 hours in milliseconds */
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * In-memory implementation of the IdempotencyLayer.
 * Tracks delivery records with a 24-hour TTL window.
 */
export class InMemoryIdempotencyLayer implements IdempotencyLayer {
  private records: Map<string, IdempotencyRecord> = new Map();
  private duplicateLog: DuplicateAttemptLog[] = [];

  /**
   * Generate a deterministic idempotency key from event type and order ID.
   * Key format: `${eventType}:${orderId}`
   */
  generateKey(eventType: OrderEventType, orderId: string): string {
    return `${eventType}:${orderId}`;
  }

  /**
   * Check if a notification with this key can be delivered.
   * Returns true if: no prior delivery, prior delivery failed, or prior status unknown.
   * Returns false if: successfully delivered within last 24 hours.
   */
  async canDeliver(key: string): Promise<boolean> {
    const record = this.records.get(key);

    // No prior record — allow delivery
    if (!record) {
      return true;
    }

    // Prior delivery failed — allow redelivery (Req 10.3)
    if (record.status === 'failed') {
      return true;
    }

    // Prior status unknown (timeout/inconclusive) — allow redelivery (Req 10.4)
    if (record.status === 'unknown') {
      return true;
    }

    // Status is 'delivered' — check if within 24-hour window (Req 10.2)
    if (record.deliveredAt) {
      const now = new Date();
      const elapsed = now.getTime() - record.deliveredAt.getTime();
      if (elapsed >= TTL_MS) {
        // Expired — allow delivery
        return true;
      }
      // Delivered within 24 hours — skip
      return false;
    }

    // deliveredAt is null but status is 'delivered' — treat as expired/allow
    return true;
  }

  /**
   * Record a successful delivery for the given key.
   * Sets status to 'delivered' and computes expiry at delivery time + 24 hours.
   */
  async recordDelivery(key: string, timestamp: Date): Promise<void> {
    const record: IdempotencyRecord = {
      key,
      notificationId: key, // simplified — in production, separate notification ID
      status: 'delivered',
      deliveredAt: timestamp,
      expiresAt: new Date(timestamp.getTime() + TTL_MS),
    };
    this.records.set(key, record);
  }

  /**
   * Log a skipped duplicate attempt with the original delivery timestamp.
   */
  async logDuplicateAttempt(key: string, originalTimestamp: Date): Promise<void> {
    this.duplicateLog.push({
      key,
      originalTimestamp,
      attemptedAt: new Date(),
    });
  }

  // --- Test helpers (not part of the interface) ---

  /** Get all duplicate attempt logs (useful for testing/debugging) */
  getDuplicateLog(): DuplicateAttemptLog[] {
    return [...this.duplicateLog];
  }

  /** Get a record by key (useful for testing/debugging) */
  getRecord(key: string): IdempotencyRecord | undefined {
    return this.records.get(key);
  }

  /** Set a record directly (useful for testing various states) */
  setRecord(key: string, record: IdempotencyRecord): void {
    this.records.set(key, record);
  }

  /** Clear all records (useful for test cleanup) */
  clear(): void {
    this.records.clear();
    this.duplicateLog = [];
  }
}
