/**
 * Customer notification preference types.
 * Defines how customers configure which events they receive and through which channels.
 */

import { DeliveryChannel } from './channels.js';
import { OrderEventType } from './events.js';

/** Configuration for a single delivery channel */
export interface ChannelPreference {
  channel: DeliveryChannel;
  enabledEvents: OrderEventType[];
  active: boolean;
}

/**
 * A customer's full notification preference configuration.
 * Controls which events are delivered and through which channels.
 */
export interface NotificationPreference {
  customerId: string;
  channels: ChannelPreference[];
  optedOutOfNonTransactional: boolean;
}

/** Result of a preference update operation */
export interface UpdateResult {
  success: boolean;
  errorMessage?: string;
}
