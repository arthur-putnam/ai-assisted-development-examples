/**
 * Preference Resolver implementation.
 * Resolves which delivery channels a notification should be sent to based on customer preferences.
 * Enforces transactional notification rules and manages preference CRUD operations.
 * Uses an in-memory store, designed to be replaceable with a database later.
 */

import { OrderEventType, DeliveryChannel } from '../types/index.js';
import type { NotificationPreference, ChannelPreference, UpdateResult } from '../types/index.js';

/** Transactional events that always deliver regardless of preference settings */
export const TRANSACTIONAL_EVENTS: OrderEventType[] = [
  OrderEventType.ORDER_PLACED,
  OrderEventType.ORDER_CANCELLED,
];

/** Non-transactional events that respect customer opt-out preferences */
export const NON_TRANSACTIONAL_EVENTS: OrderEventType[] = [
  OrderEventType.ORDER_SHIPPED,
  OrderEventType.DELIVERY_ESTIMATE_UPDATED,
  OrderEventType.ORDER_DELIVERED,
];

/**
 * Interface for the Preference Resolver.
 */
export interface PreferenceResolver {
  resolveChannels(customerId: string, eventType: OrderEventType): Promise<DeliveryChannel[]>;
  getPreference(customerId: string): Promise<NotificationPreference | null>;
  updatePreference(customerId: string, preference: NotificationPreference): Promise<UpdateResult>;
}

/**
 * In-memory implementation of the PreferenceResolver.
 * Manages customer notification preferences and resolves delivery channels.
 */
export class InMemoryPreferenceResolver implements PreferenceResolver {
  private preferences: Map<string, NotificationPreference> = new Map();

  /**
   * Resolve delivery channels for a given customer and event type.
   *
   * Rules:
   * - If no preference configured, default to EMAIL (Req 1.5, 5.4, 6.6)
   * - Transactional events (ORDER_PLACED, ORDER_CANCELLED) always deliver (Req 6.4)
   * - Non-transactional events respect customer opt-out (Req 6.3)
   * - Returns active channels that have the event type enabled
   */
  async resolveChannels(customerId: string, eventType: OrderEventType): Promise<DeliveryChannel[]> {
    const preference = this.preferences.get(customerId);

    // No preference configured — default to EMAIL (Req 1.5, 5.4, 6.6)
    if (!preference) {
      return [DeliveryChannel.EMAIL];
    }

    const isTransactional = TRANSACTIONAL_EVENTS.includes(eventType);

    // Non-transactional event + customer opted out → return empty (Req 6.3)
    if (!isTransactional && preference.optedOutOfNonTransactional) {
      return [];
    }

    // Resolve channels: find active channels that have this event type enabled
    const resolvedChannels: DeliveryChannel[] = [];

    for (const channelPref of preference.channels) {
      if (channelPref.active && channelPref.enabledEvents.includes(eventType)) {
        resolvedChannels.push(channelPref.channel);
      }
    }

    // Transactional events must have at least one channel (Req 6.4)
    // If none resolved, fall back to EMAIL
    if (isTransactional && resolvedChannels.length === 0) {
      return [DeliveryChannel.EMAIL];
    }

    return resolvedChannels;
  }

  /**
   * Get customer's full preference configuration.
   * Returns null if no preference is configured for the customer.
   */
  async getPreference(customerId: string): Promise<NotificationPreference | null> {
    return this.preferences.get(customerId) ?? null;
  }

  /**
   * Update customer preference with validation.
   *
   * Validation rules:
   * - Rejects updates that disable all channels for transactional events (Req 6.5)
   */
  async updatePreference(customerId: string, preference: NotificationPreference): Promise<UpdateResult> {
    // Validate: at least one channel must remain active for transactional events (Req 6.5)
    for (const eventType of TRANSACTIONAL_EVENTS) {
      const hasActiveChannel = preference.channels.some(
        (ch: ChannelPreference) => ch.active && ch.enabledEvents.includes(eventType)
      );

      if (!hasActiveChannel) {
        return {
          success: false,
          errorMessage: `At least one delivery channel must remain active for transactional event: ${eventType}`,
        };
      }
    }

    this.preferences.set(customerId, { ...preference, customerId });
    return { success: true };
  }

  // --- Test helpers (not part of the interface) ---

  /** Clear all preferences (useful for test cleanup) */
  clear(): void {
    this.preferences.clear();
  }

  /** Get the number of stored preferences (useful for testing) */
  size(): number {
    return this.preferences.size;
  }
}
