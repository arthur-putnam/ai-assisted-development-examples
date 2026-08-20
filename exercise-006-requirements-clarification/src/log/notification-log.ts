/**
 * In-memory implementation of the NotificationLog interface.
 * Uses write-ahead pattern: entries are persisted with PENDING status before delivery.
 * Designed to be replaceable with a database-backed implementation later.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  DeliveryChannel,
  DeliveryStatus,
  OrderEventType,
  type NotificationLogEntry,
  type PaginatedResult,
} from '../types/index.js';

/** Maximum number of entries per page */
const MAX_PAGE_SIZE = 50;

/** Default number of entries per page */
const DEFAULT_PAGE_SIZE = 50;

export interface NotificationLog {
  /** Persist a delivery attempt (write-ahead, before actual delivery) */
  logAttempt(entry: NotificationLogEntry): Promise<void>;

  /** Update the delivery status of an existing log entry */
  updateStatus(entryId: string, status: DeliveryStatus, errorMessage?: string): Promise<void>;

  /**
   * Query notification history by order ID.
   * Returns paginated results sorted by timestamp descending.
   * Max 50 entries per page.
   * Returns empty result set (not error) for non-existent orders.
   */
  queryByOrder(
    orderId: string,
    page: number,
    pageSize?: number
  ): Promise<PaginatedResult<NotificationLogEntry>>;

  /** Log a skipped duplicate delivery attempt */
  logDuplicate(idempotencyKey: string, originalDeliveryTimestamp: Date): Promise<void>;
}

/** Record for a skipped duplicate attempt */
export interface DuplicateLogEntry {
  id: string;
  idempotencyKey: string;
  originalDeliveryTimestamp: Date;
  skippedAt: Date;
}

/**
 * In-memory notification log implementation.
 * Stores log entries in an array and supports pagination.
 */
export class InMemoryNotificationLog implements NotificationLog {
  private entries: NotificationLogEntry[] = [];
  private duplicates: DuplicateLogEntry[] = [];

  async logAttempt(entry: NotificationLogEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async updateStatus(
    entryId: string,
    status: DeliveryStatus,
    errorMessage?: string
  ): Promise<void> {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry) {
      return;
    }
    entry.status = status;
    if (errorMessage !== undefined) {
      entry.errorMessage = errorMessage;
    }
  }

  async queryByOrder(
    orderId: string,
    page: number,
    pageSize?: number
  ): Promise<PaginatedResult<NotificationLogEntry>> {
    const effectivePageSize = Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const effectivePage = Math.max(page, 1);

    // Filter entries for the requested order
    const filtered = this.entries
      .filter((e) => e.orderId === orderId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const totalCount = filtered.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const entries = filtered.slice(startIndex, startIndex + effectivePageSize);
    const hasNextPage = startIndex + effectivePageSize < totalCount;

    return {
      entries,
      totalCount,
      page: effectivePage,
      pageSize: effectivePageSize,
      hasNextPage,
      ...(hasNextPage ? { nextPageToken: String(effectivePage + 1) } : {}),
    };
  }

  async logDuplicate(
    idempotencyKey: string,
    originalDeliveryTimestamp: Date
  ): Promise<void> {
    this.duplicates.push({
      id: uuidv4(),
      idempotencyKey,
      originalDeliveryTimestamp,
      skippedAt: new Date(),
    });
  }

  /** Expose duplicates for testing/debugging */
  getDuplicates(): DuplicateLogEntry[] {
    return [...this.duplicates];
  }

  /** Expose all entries for testing/debugging */
  getEntries(): NotificationLogEntry[] {
    return [...this.entries];
  }
}
