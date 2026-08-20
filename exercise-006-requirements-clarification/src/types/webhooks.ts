/**
 * Webhook endpoint types.
 * Defines structures for webhook registration, verification, and delivery.
 */

/** A registered webhook endpoint for a customer */
export interface WebhookEndpoint {
  customerId: string;
  endpointUrl: string;
  /** Shared secret for HMAC-SHA256 payload signing */
  secret: string;
  active: boolean;
  verifiedAt?: Date;
}

/** Result of a webhook endpoint verification attempt */
export interface VerificationResult {
  verified: boolean;
  errorMessage?: string;
}
