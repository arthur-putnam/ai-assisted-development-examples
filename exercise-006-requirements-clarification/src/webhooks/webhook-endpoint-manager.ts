/**
 * Webhook Endpoint Manager.
 * Handles registration, verification, and lifecycle of webhook endpoints.
 */

import { randomBytes } from 'node:crypto';
import { WebhookEndpoint, VerificationResult } from '../types/index.js';

/** Function signature for verifying a webhook endpoint URL */
export type VerifyEndpointFn = (endpointUrl: string) => Promise<VerificationResult>;

/** Interface for webhook endpoint management */
export interface WebhookEndpointManager {
  registerEndpoint(
    customerId: string,
    endpointUrl: string
  ): Promise<{ success: boolean; errorMessage?: string }>;
  getActiveEndpoint(customerId: string): Promise<WebhookEndpoint | null>;
  deactivateEndpoint(customerId: string): Promise<void>;
}

/**
 * In-memory implementation of WebhookEndpointManager.
 * Validates endpoints via an injected verification function, generates
 * shared secrets, and stores active endpoints per customer.
 */
export class InMemoryWebhookEndpointManager implements WebhookEndpointManager {
  private readonly endpoints: Map<string, WebhookEndpoint> = new Map();

  constructor(private readonly verifyEndpoint: VerifyEndpointFn) {}

  async registerEndpoint(
    customerId: string,
    endpointUrl: string
  ): Promise<{ success: boolean; errorMessage?: string }> {
    const result = await this.verifyEndpoint(endpointUrl);

    if (!result.verified) {
      return {
        success: false,
        errorMessage: result.errorMessage ?? 'Endpoint verification failed',
      };
    }

    const secret = randomBytes(32).toString('hex');

    const endpoint: WebhookEndpoint = {
      customerId,
      endpointUrl,
      secret,
      active: true,
      verifiedAt: new Date(),
    };

    this.endpoints.set(customerId, endpoint);

    return { success: true };
  }

  async getActiveEndpoint(customerId: string): Promise<WebhookEndpoint | null> {
    const endpoint = this.endpoints.get(customerId);
    if (!endpoint || !endpoint.active) {
      return null;
    }
    return endpoint;
  }

  async deactivateEndpoint(customerId: string): Promise<void> {
    const endpoint = this.endpoints.get(customerId);
    if (endpoint) {
      endpoint.active = false;
    }
  }
}
