/**
 * Webhook channel adapter.
 * Delivers notifications via HTTP POST with HMAC-SHA256 payload signing.
 * Supports endpoint verification with a 5-second timeout.
 */

import { createHmac } from 'node:crypto';
import { NotificationContent, ChannelDeliveryResult, VerificationResult } from '../types/index.js';
import { ChannelAdapter } from './email-adapter.js';

/** HTTP response from the HttpClient */
export interface HttpResponse {
  statusCode: number;
  body?: string;
}

/** Injectable HTTP client for making requests */
export interface HttpClient {
  post(url: string, body: string, headers: Record<string, string>, timeoutMs: number): Promise<HttpResponse>;
}

/** Resolves webhook endpoint details (URL and secret) for a given customer */
export interface WebhookEndpointResolver {
  getEndpoint(customerId: string): Promise<{ endpointUrl: string; secret: string } | null>;
}

/** Webhook adapter interface extending the base channel adapter */
export interface WebhookAdapterInterface extends ChannelAdapter {
  verifyEndpoint(endpointUrl: string): Promise<VerificationResult>;
  signPayload(payload: string, secret: string): string;
}

/** Default delivery timeout for webhook requests (10 seconds) */
const DELIVERY_TIMEOUT_MS = 10_000;

/** Verification request timeout (5 seconds) */
const VERIFICATION_TIMEOUT_MS = 5_000;

/** Header name for the HMAC-SHA256 signature */
const SIGNATURE_HEADER = 'X-Webhook-Signature';

/**
 * Adapter that delivers notifications to customer webhook endpoints.
 * Signs payloads with HMAC-SHA256 for authenticity verification.
 */
export class WebhookAdapter implements WebhookAdapterInterface {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly endpointResolver: WebhookEndpointResolver,
  ) {}

  /**
   * Send notification content to the customer's webhook endpoint.
   * Looks up the endpoint URL and secret, signs the payload, and sends an HTTP POST.
   */
  async send(customerId: string, content: NotificationContent): Promise<ChannelDeliveryResult> {
    const endpoint = await this.endpointResolver.getEndpoint(customerId);

    if (!endpoint) {
      return {
        success: false,
        errorMessage: `No active webhook endpoint found for customer ${customerId}`,
      };
    }

    const payload = JSON.stringify(content);
    const signature = this.signPayload(payload, endpoint.secret);

    try {
      const response = await this.httpClient.post(
        endpoint.endpointUrl,
        payload,
        {
          'Content-Type': 'application/json',
          [SIGNATURE_HEADER]: signature,
        },
        DELIVERY_TIMEOUT_MS,
      );

      const success = response.statusCode >= 200 && response.statusCode < 300;
      return {
        success,
        statusCode: response.statusCode,
        errorMessage: success ? undefined : `Webhook delivery failed with status ${response.statusCode}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown webhook delivery error';
      return {
        success: false,
        errorMessage,
      };
    }
  }

  /**
   * Sign a payload string with HMAC-SHA256 using the provided secret.
   * Returns the hex-encoded signature.
   */
  signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify a webhook endpoint by sending a verification POST request.
   * Endpoint is marked active only if it responds with a 2xx status within 5 seconds.
   */
  async verifyEndpoint(endpointUrl: string): Promise<VerificationResult> {
    try {
      const response = await this.httpClient.post(
        endpointUrl,
        JSON.stringify({ type: 'verification' }),
        { 'Content-Type': 'application/json' },
        VERIFICATION_TIMEOUT_MS,
      );

      const verified = response.statusCode >= 200 && response.statusCode < 300;
      return {
        verified,
        errorMessage: verified
          ? undefined
          : `Endpoint verification failed with status ${response.statusCode}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
      return {
        verified: false,
        errorMessage: `Endpoint verification failed: ${errorMessage}`,
      };
    }
  }
}
