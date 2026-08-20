/**
 * Email channel adapter.
 * Delivers notifications via an injected email provider client.
 */

import { NotificationContent, ChannelDeliveryResult } from '../types/index.js';

/** Interface for the injected email provider dependency */
export interface EmailProviderClient {
  sendEmail(to: string, subject: string, body: string): Promise<{ statusCode: number }>;
}

/** Interface for the channel adapter contract */
export interface ChannelAdapter {
  send(customerId: string, content: NotificationContent): Promise<ChannelDeliveryResult>;
}

/**
 * Adapter that delivers notifications through an email provider.
 * Handles provider errors gracefully, returning structured results.
 */
export class EmailAdapter implements ChannelAdapter {
  constructor(private readonly provider: EmailProviderClient) {}

  async send(customerId: string, content: NotificationContent): Promise<ChannelDeliveryResult> {
    try {
      const result = await this.provider.sendEmail(customerId, content.subject, content.body);
      const success = result.statusCode >= 200 && result.statusCode < 300;
      return {
        success,
        statusCode: result.statusCode,
        errorMessage: success ? undefined : `Email delivery failed with status ${result.statusCode}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown email delivery error';
      return {
        success: false,
        errorMessage,
      };
    }
  }
}
