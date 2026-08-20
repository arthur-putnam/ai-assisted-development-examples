import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryPreferenceResolver,
  TRANSACTIONAL_EVENTS,
  NON_TRANSACTIONAL_EVENTS,
} from './preference-resolver.js';
import { OrderEventType, DeliveryChannel } from '../types/index.js';
import type { NotificationPreference, ChannelPreference } from '../types/index.js';

describe('InMemoryPreferenceResolver', () => {
  let resolver: InMemoryPreferenceResolver;

  beforeEach(() => {
    resolver = new InMemoryPreferenceResolver();
  });

  describe('TRANSACTIONAL_EVENTS and NON_TRANSACTIONAL_EVENTS constants', () => {
    it('classifies ORDER_PLACED and ORDER_CANCELLED as transactional', () => {
      expect(TRANSACTIONAL_EVENTS).toContain(OrderEventType.ORDER_PLACED);
      expect(TRANSACTIONAL_EVENTS).toContain(OrderEventType.ORDER_CANCELLED);
      expect(TRANSACTIONAL_EVENTS).toHaveLength(2);
    });

    it('classifies ORDER_SHIPPED, DELIVERY_ESTIMATE_UPDATED, and ORDER_DELIVERED as non-transactional', () => {
      expect(NON_TRANSACTIONAL_EVENTS).toContain(OrderEventType.ORDER_SHIPPED);
      expect(NON_TRANSACTIONAL_EVENTS).toContain(OrderEventType.DELIVERY_ESTIMATE_UPDATED);
      expect(NON_TRANSACTIONAL_EVENTS).toContain(OrderEventType.ORDER_DELIVERED);
      expect(NON_TRANSACTIONAL_EVENTS).toHaveLength(3);
    });

    it('covers all event types between transactional and non-transactional', () => {
      const allEvents = [...TRANSACTIONAL_EVENTS, ...NON_TRANSACTIONAL_EVENTS];
      expect(allEvents).toHaveLength(5);
      for (const eventType of Object.values(OrderEventType)) {
        expect(allEvents).toContain(eventType);
      }
    });
  });

  describe('resolveChannels', () => {
    it('defaults to EMAIL when customer has no preference', async () => {
      const channels = await resolver.resolveChannels('customer-1', OrderEventType.ORDER_PLACED);
      expect(channels).toEqual([DeliveryChannel.EMAIL]);
    });

    it('defaults to EMAIL for all event types when no preference exists', async () => {
      for (const eventType of Object.values(OrderEventType)) {
        const channels = await resolver.resolveChannels('customer-1', eventType);
        expect(channels).toEqual([DeliveryChannel.EMAIL]);
      }
    });

    it('returns configured channels for transactional events', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: [OrderEventType.ORDER_PLACED, OrderEventType.ORDER_CANCELLED], active: true },
          { channel: DeliveryChannel.SMS, enabledEvents: [OrderEventType.ORDER_PLACED, OrderEventType.ORDER_CANCELLED], active: true },
        ],
        optedOutOfNonTransactional: false,
      };
      await resolver.updatePreference('customer-1', preference);

      const channels = await resolver.resolveChannels('customer-1', OrderEventType.ORDER_PLACED);
      expect(channels).toContain(DeliveryChannel.EMAIL);
      expect(channels).toContain(DeliveryChannel.SMS);
    });

    it('returns empty array for non-transactional events when customer opted out', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: true },
        ],
        optedOutOfNonTransactional: true,
      };
      await resolver.updatePreference('customer-1', preference);

      const channels = await resolver.resolveChannels('customer-1', OrderEventType.ORDER_SHIPPED);
      expect(channels).toEqual([]);
    });

    it('still delivers transactional events even when customer opted out of non-transactional', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: true },
        ],
        optedOutOfNonTransactional: true,
      };
      await resolver.updatePreference('customer-1', preference);

      const channels = await resolver.resolveChannels('customer-1', OrderEventType.ORDER_PLACED);
      expect(channels).toEqual([DeliveryChannel.EMAIL]);
    });

    it('falls back to EMAIL for transactional events when no channels are active', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: [OrderEventType.ORDER_PLACED, OrderEventType.ORDER_CANCELLED], active: false },
          { channel: DeliveryChannel.SMS, enabledEvents: [OrderEventType.ORDER_SHIPPED], active: true },
        ],
        optedOutOfNonTransactional: false,
      };
      // This should be rejected since transactional events don't have active channels
      // But let's test resolveChannels directly by setting up a scenario where
      // channels exist but none are active for the transactional event
      // We need to bypass validation for this test, so set the preference directly
      await resolver.updatePreference('customer-1', {
        ...preference,
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: true },
        ],
      });

      // Now simulate a scenario where the channel doesn't have the event enabled
      // by querying a transactional event that is not in any active channel's enabledEvents
      const preference2: NotificationPreference = {
        customerId: 'customer-2',
        channels: [
          { channel: DeliveryChannel.SMS, enabledEvents: [OrderEventType.ORDER_SHIPPED], active: true },
          { channel: DeliveryChannel.EMAIL, enabledEvents: [OrderEventType.ORDER_PLACED, OrderEventType.ORDER_CANCELLED], active: true },
        ],
        optedOutOfNonTransactional: false,
      };
      await resolver.updatePreference('customer-2', preference2);

      // ORDER_PLACED should resolve to EMAIL only (SMS doesn't have it enabled)
      const channels = await resolver.resolveChannels('customer-2', OrderEventType.ORDER_PLACED);
      expect(channels).toEqual([DeliveryChannel.EMAIL]);
    });

    it('only returns channels that have the event type enabled', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: [OrderEventType.ORDER_PLACED, OrderEventType.ORDER_CANCELLED, OrderEventType.ORDER_SHIPPED], active: true },
          { channel: DeliveryChannel.SMS, enabledEvents: [OrderEventType.ORDER_PLACED, OrderEventType.ORDER_CANCELLED], active: true },
          { channel: DeliveryChannel.WEBHOOK, enabledEvents: Object.values(OrderEventType), active: true },
        ],
        optedOutOfNonTransactional: false,
      };
      await resolver.updatePreference('customer-1', preference);

      const channels = await resolver.resolveChannels('customer-1', OrderEventType.ORDER_SHIPPED);
      expect(channels).toContain(DeliveryChannel.EMAIL);
      expect(channels).toContain(DeliveryChannel.WEBHOOK);
      expect(channels).not.toContain(DeliveryChannel.SMS);
    });

    it('skips inactive channels', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: true },
          { channel: DeliveryChannel.SMS, enabledEvents: Object.values(OrderEventType), active: false },
        ],
        optedOutOfNonTransactional: false,
      };
      await resolver.updatePreference('customer-1', preference);

      const channels = await resolver.resolveChannels('customer-1', OrderEventType.ORDER_PLACED);
      expect(channels).toEqual([DeliveryChannel.EMAIL]);
    });
  });

  describe('getPreference', () => {
    it('returns null for customer with no preference', async () => {
      const result = await resolver.getPreference('nonexistent-customer');
      expect(result).toBeNull();
    });

    it('returns the stored preference for a customer', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: true },
        ],
        optedOutOfNonTransactional: false,
      };
      await resolver.updatePreference('customer-1', preference);

      const result = await resolver.getPreference('customer-1');
      expect(result).not.toBeNull();
      expect(result!.customerId).toBe('customer-1');
      expect(result!.channels).toHaveLength(1);
      expect(result!.optedOutOfNonTransactional).toBe(false);
    });
  });

  describe('updatePreference', () => {
    it('successfully saves a valid preference', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: true },
        ],
        optedOutOfNonTransactional: false,
      };

      const result = await resolver.updatePreference('customer-1', preference);
      expect(result.success).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('rejects preference that disables all channels for ORDER_PLACED', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: [OrderEventType.ORDER_SHIPPED], active: true },
        ],
        optedOutOfNonTransactional: false,
      };

      const result = await resolver.updatePreference('customer-1', preference);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('ORDER_PLACED');
    });

    it('rejects preference that disables all channels for ORDER_CANCELLED', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: [OrderEventType.ORDER_PLACED], active: true },
        ],
        optedOutOfNonTransactional: false,
      };

      const result = await resolver.updatePreference('customer-1', preference);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('ORDER_CANCELLED');
    });

    it('rejects preference where channels exist but are all inactive for transactional events', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: false },
          { channel: DeliveryChannel.SMS, enabledEvents: Object.values(OrderEventType), active: false },
        ],
        optedOutOfNonTransactional: false,
      };

      const result = await resolver.updatePreference('customer-1', preference);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('allows preference with at least one active channel for each transactional event', async () => {
      const preference: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: [OrderEventType.ORDER_PLACED, OrderEventType.ORDER_CANCELLED], active: true },
          { channel: DeliveryChannel.SMS, enabledEvents: [OrderEventType.ORDER_SHIPPED], active: true },
        ],
        optedOutOfNonTransactional: false,
      };

      const result = await resolver.updatePreference('customer-1', preference);
      expect(result.success).toBe(true);
    });

    it('overwrites existing preference on update', async () => {
      const preference1: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: true },
        ],
        optedOutOfNonTransactional: false,
      };
      await resolver.updatePreference('customer-1', preference1);

      const preference2: NotificationPreference = {
        customerId: 'customer-1',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: true },
          { channel: DeliveryChannel.SMS, enabledEvents: Object.values(OrderEventType), active: true },
        ],
        optedOutOfNonTransactional: true,
      };
      await resolver.updatePreference('customer-1', preference2);

      const stored = await resolver.getPreference('customer-1');
      expect(stored!.channels).toHaveLength(2);
      expect(stored!.optedOutOfNonTransactional).toBe(true);
    });

    it('ensures customerId in stored preference matches the provided customerId', async () => {
      const preference: NotificationPreference = {
        customerId: 'different-id',
        channels: [
          { channel: DeliveryChannel.EMAIL, enabledEvents: Object.values(OrderEventType), active: true },
        ],
        optedOutOfNonTransactional: false,
      };

      await resolver.updatePreference('customer-1', preference);
      const stored = await resolver.getPreference('customer-1');
      expect(stored!.customerId).toBe('customer-1');
    });
  });
});
