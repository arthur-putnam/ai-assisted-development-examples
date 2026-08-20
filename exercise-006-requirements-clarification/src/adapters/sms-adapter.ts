/**
 * SMS channel adapter.
 * Delivers notifications via an injected SMS provider client.
 */

import { NotificationContent, ChannelDeliveryResult } from '../types/index.js';

/** Interface for the injected SMS provider dependency */
export interface SmsProviderClient {
  sendSms(to: string, message: string): Promise<{ statusCode: number }>;
}

/** Interface for the channel adapter contract */
export interface ChannelAdapter {
  send(customerId: string, content: NotificationContent): Promise<ChannelDeliveryResult>;
}

/**
 * Adapter that delivers notifications through an SMS provider.
 * Handles provider errors gracefully, returning structured results.
 */
export class SmsAdapter implements ChannelAdapter {
  constructor(private readonly provider: SmsProviderClient) {}

  async send(customerId: string, content: NotificationContent): Promise<ChannelDeliveryResult> {
    try {
      const message = `${content.subject}: ${content.body}`;
      const result = await this.provider.sendSms(customerId, message);
      const success = result.statusCode >= 200 && result.statusCode < 300;
      return {
        success,
        statusCode: result.statusCode,
        errorMessage: success ? undefined : `SMS delivery failed with status ${result.statusCode}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown SMS delivery error';
      return {
        success: false,
        errorMessage,
      };
    }
  }
}
