# Implementation Plan: Order Notifications

## Overview

This plan implements an event-driven notification service that listens to order lifecycle events and delivers notifications through Email, SMS, and Webhook channels. The implementation is structured to build foundational types and interfaces first, then core business logic components, followed by delivery infrastructure, and finally wiring everything together with integration tests.

## Tasks

- [x] 1. Set up project structure, core types, and interfaces
  - [x] 1.1 Create project directory structure and initialize TypeScript configuration
    - Create `src/` directory with subdirectories: `types/`, `consumers/`, `engine/`, `adapters/`, `retry/`, `log/`, `preferences/`, `webhooks/`, `idempotency/`
    - Initialize `tsconfig.json`, `package.json` with dependencies (fast-check for testing, uuid for IDs, crypto for HMAC)
    - Set up test framework (Jest or Vitest) with TypeScript support
    - _Requirements: All_

  - [x] 1.2 Define core enums, interfaces, and type definitions
    - Create `src/types/events.ts` with `OrderEvent`, `OrderEventType` enum, and all payload interfaces (`OrderPlacedPayload`, `OrderShippedPayload`, `DeliveryEstimatePayload`, `OrderDeliveredPayload`, `OrderCancelledPayload`)
    - Create `src/types/channels.ts` with `DeliveryChannel` enum, `DeliveryStatus` enum, `DeliveryResult`, `ChannelDeliveryResult`
    - Create `src/types/preferences.ts` with `NotificationPreference`, `ChannelPreference`, `UpdateResult`
    - Create `src/types/notifications.ts` with `NotificationContent`, `NotificationLogEntry`, `PaginatedResult`
    - Create `src/types/retry.ts` with `RetryPolicy`, `STANDARD_RETRY_POLICY`, `WEBHOOK_RETRY_POLICY` constants
    - Create `src/types/idempotency.ts` with `IdempotencyRecord` interface
    - Create `src/types/webhooks.ts` with `WebhookEndpoint`, `VerificationResult`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 7.1, 8.1, 10.1_

- [x] 2. Implement Idempotency Layer
  - [x] 2.1 Implement idempotency key generation and duplicate detection
    - Create `src/idempotency/idempotency-layer.ts` implementing the `IdempotencyLayer` interface
    - Implement deterministic key generation: `${eventType}:${orderId}`
    - Implement `canDeliver()` that checks if a notification with the same key was delivered within 24 hours
    - Implement `recordDelivery()` to persist successful delivery timestamps
    - Implement `logDuplicateAttempt()` to record skipped duplicates
    - Use in-memory store (Map) with TTL for initial implementation, replaceable with database later
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 2.2 Write property test for idempotency key determinism
    - **Property 12: Idempotency key determinism**
    - Generate random (OrderEventType, orderId) pairs and verify same inputs produce same key and distinct inputs produce distinct keys
    - **Validates: Requirements 10.1**

  - [ ]* 2.3 Write property test for duplicate prevention
    - **Property 13: Duplicate prevention**
    - Generate random delivery histories with varying statuses and verify: delivered within 24h → skip; failed → permit; unknown → permit
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [x] 3. Implement Preference Resolver
  - [x] 3.1 Implement customer preference resolution and management
    - Create `src/preferences/preference-resolver.ts` implementing the `PreferenceResolver` interface
    - Implement `resolveChannels()` with rules: transactional events always deliver, non-transactional respect opt-out, default to EMAIL if no preference
    - Define `TRANSACTIONAL_EVENTS` (ORDER_PLACED, ORDER_CANCELLED) and `NON_TRANSACTIONAL_EVENTS` (ORDER_SHIPPED, DELIVERY_ESTIMATE_UPDATED, ORDER_DELIVERED)
    - Implement `getPreference()` and `updatePreference()` with validation that rejects disabling all channels for transactional events
    - Use in-memory store for preferences, replaceable with database later
    - _Requirements: 1.3, 1.5, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 3.2 Write property test for channel routing correctness
    - **Property 2: Channel routing correctness**
    - Generate random preference configurations and event types, verify channels match active configured channels or default to EMAIL
    - **Validates: Requirements 1.3, 1.5, 4.4, 5.3, 5.4, 6.6**

  - [ ]* 3.3 Write property test for transactional notification override
    - **Property 7: Transactional notification override**
    - Generate random configs including all-disabled scenarios, verify ORDER_PLACED and ORDER_CANCELLED always deliver through at least one channel
    - **Validates: Requirements 6.4, 6.5**

  - [ ]* 3.4 Write property test for preference update propagation
    - **Property 6: Preference update propagation**
    - Generate random preference updates and subsequent events, verify routing reflects new config and bulk opt-out prevents non-transactional delivery
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 4. Implement Content Assembler
  - [x] 4.1 Implement notification content assembly per event type
    - Create `src/engine/content-assembler.ts` implementing the `ContentAssembler` interface
    - Implement `assemble()` method that produces `NotificationContent` based on event type
    - ORDER_PLACED: include order ID, order total, list of items (name, quantity, unit price)
    - ORDER_SHIPPED: include order ID, carrier name, tracking number
    - DELIVERY_ESTIMATE_UPDATED: include order ID, carrier name, tracking number, estimated delivery date
    - ORDER_DELIVERED: include order ID, delivery timestamp
    - ORDER_CANCELLED: include order ID, cancellation reason, refund amount (if applicable), estimated refund processing time (if applicable)
    - _Requirements: 1.2, 2.2, 2.4, 3.2, 4.2, 4.3_

  - [ ]* 4.2 Write property test for notification content completeness
    - **Property 1: Notification content completeness**
    - Generate random OrderEventPayloads per event type, verify assembled content includes all required fields
    - **Validates: Requirements 1.2, 2.2, 2.4, 3.2, 4.2, 4.3**

- [x] 5. Checkpoint - Core business logic verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Notification Log
  - [x] 6.1 Implement notification logging with write-ahead pattern
    - Create `src/log/notification-log.ts` implementing the `NotificationLog` interface
    - Implement `logAttempt()` that persists a PENDING entry before delivery
    - Implement `updateStatus()` to update delivery outcome (DELIVERED or FAILED with reason)
    - Implement `queryByOrder()` with pagination (max 50 per page), sorted by timestamp descending, returns empty result for non-existent orders
    - Implement `logDuplicate()` to record skipped duplicate attempts
    - Use in-memory store with array-based pagination, replaceable with database later
    - _Requirements: 8.2, 8.3, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 6.2 Write property test for write-ahead delivery logging
    - **Property 10: Write-ahead delivery logging**
    - Generate random delivery sequences, verify PENDING log entry exists before delivery call and status is updated after completion
    - **Validates: Requirements 8.2, 8.3, 8.5**

  - [ ]* 6.3 Write property test for notification log query correctness
    - **Property 11: Notification log query correctness**
    - Generate random log entries, verify filter by order ID, sort by timestamp descending, max 50 per page with pagination, and empty result for non-existent orders
    - **Validates: Requirements 9.1, 9.2, 9.4**

- [x] 7. Implement Channel Adapters
  - [x] 7.1 Implement Email and SMS channel adapters
    - Create `src/adapters/email-adapter.ts` implementing `ChannelAdapter` interface
    - Create `src/adapters/sms-adapter.ts` implementing `ChannelAdapter` interface
    - Both adapters should accept a provider client (injected dependency) and return `ChannelDeliveryResult`
    - Handle provider errors gracefully, returning success/failure status with error messages
    - _Requirements: 5.1, 5.2_

  - [x] 7.2 Implement Webhook adapter with HMAC signing and endpoint verification
    - Create `src/adapters/webhook-adapter.ts` implementing `WebhookAdapter` interface
    - Implement `send()` that sends HTTP POST with JSON payload and HMAC-SHA256 signature header
    - Implement `signPayload()` using Node.js crypto module with customer's shared secret
    - Implement `verifyEndpoint()` that sends verification request with 5-second timeout, active only on 2xx response
    - _Requirements: 7.1, 7.2, 7.3, 7.6_

  - [ ]* 7.3 Write property test for webhook payload integrity
    - **Property 9: Webhook payload integrity**
    - Generate random payloads, sign with HMAC-SHA256, verify round-trip (sign then verify produces match)
    - **Validates: Requirements 7.3, 7.6**

  - [ ]* 7.4 Write property test for webhook endpoint verification
    - **Property 8: Webhook endpoint verification**
    - Generate random HTTP responses (2xx, non-2xx, timeouts), verify endpoint marked active only on 2xx within 5 seconds
    - **Validates: Requirements 7.1, 7.2**

- [x] 8. Implement Webhook Endpoint Manager
  - [x] 8.1 Implement webhook endpoint registration and management
    - Create `src/webhooks/webhook-endpoint-manager.ts` implementing `WebhookEndpointManager` interface
    - Implement `registerEndpoint()` that validates via WebhookAdapter, generates shared secret, stores endpoint
    - Implement `getActiveEndpoint()` and `deactivateEndpoint()`
    - Use in-memory store for endpoints, replaceable with database later
    - _Requirements: 7.1, 7.2_

- [x] 9. Implement Retry Manager
  - [x] 9.1 Implement retry scheduling with exponential backoff
    - Create `src/retry/retry-manager.ts` implementing `RetryManager` interface
    - Implement `scheduleRetry()` that calculates next retry time based on policy and attempt number, returns null if max attempts exhausted
    - Implement `processRetries()` that checks pending retries and re-attempts delivery
    - Implement `markPermanentlyFailed()` for notifications exceeding retry limits
    - Support both STANDARD_RETRY_POLICY (3 attempts: 1min, 5min, 15min) and WEBHOOK_RETRY_POLICY (5 attempts: 30s, 60s, 120s, 240s, 480s)
    - _Requirements: 1.4, 3.3, 4.5, 7.4, 7.5, 8.1, 8.4, 8.5_

  - [ ]* 9.2 Write property test for standard retry policy compliance
    - **Property 3: Standard retry policy compliance**
    - Generate random failure sequences with attempt counts, verify at most 3 retries at 1min/5min/15min intervals and no further retries after third attempt
    - **Validates: Requirements 1.4, 3.3, 4.5, 8.1**

  - [ ]* 9.3 Write property test for webhook retry policy compliance
    - **Property 4: Webhook retry policy compliance**
    - Generate random webhook failure sequences, verify at most 5 retries with exponential backoff starting at 30s, and permanent failure after fifth attempt
    - **Validates: Requirements 7.4, 7.5**

- [x] 10. Checkpoint - Delivery infrastructure verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Delivery Router
  - [x] 11.1 Implement delivery routing to channel adapters
    - Create `src/engine/delivery-router.ts` implementing `DeliveryRouter` interface
    - Implement `deliver()` that routes to appropriate channel adapter for each specified channel
    - Ensure channel independence: failure in one channel does not block or delay others (use Promise.allSettled or equivalent)
    - Record delivery results independently per channel
    - Integrate with RetryManager for failed deliveries
    - _Requirements: 5.1, 5.2, 5.5_

  - [ ]* 11.2 Write property test for channel independence
    - **Property 5: Channel independence**
    - Generate multi-channel delivery scenarios with random failure patterns, verify failure in one channel does not prevent/delay others and each failure is recorded independently
    - **Validates: Requirements 5.5**

- [x] 12. Implement Shipping Deferral Handler
  - [x] 12.1 Implement shipping notification deferral logic
    - Create `src/engine/shipping-deferral-handler.ts` implementing `ShippingDeferralHandler` interface
    - Implement `handleShippedEvent()` that defers notification if carrier or tracking is missing, up to 10 minutes
    - Implement `processDeferredNotifications()` that releases deferred notifications when data arrives or timeout elapses
    - Use in-memory queue with expiration tracking
    - _Requirements: 2.5_

- [x] 13. Implement Notification Engine
  - [x] 13.1 Implement core notification engine orchestration
    - Create `src/engine/notification-engine.ts` implementing the main orchestration logic
    - Wire together: IdempotencyLayer → PreferenceResolver → ContentAssembler → NotificationLog (write-ahead) → DeliveryRouter
    - Implement the full notification lifecycle: check idempotency → resolve channels → assemble content → log pending → deliver → update log
    - Handle shipping deferral by delegating ORDER_SHIPPED events to ShippingDeferralHandler when carrier/tracking is missing
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.2, 8.3, 10.1, 10.2_

- [x] 14. Implement Event Consumer
  - [x] 14.1 Implement message queue consumer
    - Create `src/consumers/event-consumer.ts` implementing `EventConsumer` interface
    - Implement `subscribe()` to connect to message queue
    - Implement `handleEvent()` that deserializes the event and dispatches to NotificationEngine
    - Handle deserialization errors gracefully (log and skip malformed events)
    - _Requirements: 1.1, 2.1, 2.3, 3.1, 4.1_

- [x] 15. Checkpoint - Full system integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Integration wiring and end-to-end tests
  - [x] 16.1 Wire all components together with dependency injection
    - Create `src/index.ts` as the composition root
    - Instantiate all components with proper dependency injection
    - Export a factory function that creates a fully-wired NotificationService instance
    - _Requirements: All_

  - [ ]* 16.2 Write integration tests for end-to-end notification flows
    - Test complete flow: order placed → notification generated → delivered via configured channels
    - Test shipping deferral: missing carrier → wait → carrier arrives → notification sent
    - Test retry flow: delivery fails → retries scheduled → eventual success or permanent failure
    - Test duplicate prevention: same event processed twice → second delivery skipped
    - Test preference update: change preference → next notification uses new channels
    - _Requirements: 1.1, 2.5, 5.5, 8.1, 10.2, 6.2_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All data stores use in-memory implementations initially, designed for easy replacement with persistent stores
- The implementation uses TypeScript as specified in the design document

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "4.2"] },
    { "id": 4, "tasks": ["6.1", "7.1", "7.2", "8.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.3", "7.4", "9.1"] },
    { "id": 6, "tasks": ["9.2", "9.3", "11.1", "12.1"] },
    { "id": 7, "tasks": ["11.2", "13.1"] },
    { "id": 8, "tasks": ["14.1"] },
    { "id": 9, "tasks": ["16.1"] },
    { "id": 10, "tasks": ["16.2"] }
  ]
}
```
