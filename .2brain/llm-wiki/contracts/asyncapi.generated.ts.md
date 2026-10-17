---
source: contracts/asyncapi.generated.ts
sha256: cf452f8d8a62e8124496e188b838efe342925f55bfb2790fd8a0e451a6cbb073
generated_at: 2026-10-16T23:54:02.826844+00:00
model: ollama:qwen3.8:27b
---

# contracts/asyncapi.generated.ts

## Purpose

Auto-generated TypeScript type definitions and constants for all AsyncAPI event channels in the project. It is the single source of truth for event names, payload shapes, and channel identifiers, produced from `asyncapi.yaml` by `npm run gen:asyncapi`. It exists so that producers, consumers, and the SSE layer all agree on wire formats without hand-maintained duplication.

## Key elements

- **Event envelope interfaces** (`OrderCreatedEnvelope`, `ShipmentShippedEnvelope`, `PaymentSucceededEnvelope`, `ReturnRequestedEnvelope`, etc.) — each pairs a `type` discriminator (string literal), a `timestamp`, and a `data` payload.
- **Payload interfaces** — concrete shapes for each event body: `OrderIdPayload`, `ShipmentPayload`, `PaymentEventPayload`, `PaymentRefundedPayload`, `ReturnRequestedPayload`, `NotificationCreatedPayload` (union of five notification sub-types), `ObservabilityMetricsPayload`, `NotificationsDeletedPayload`, `NotificationsReadPayload`.
- **Event type aliases** (`OrderCreatedEvent`, `PaymentSucceededEvent`, …) — map each event name to its envelope type for ergonomic imports.
- **Channel constants** — `as const` objects per namespace: `OBSERVABILITY_CHANNELS`, `ORDER_CHANNELS`, `SHIPMENT_CHANNELS`, `PAYMENT_CHANNELS`, `RETURN_CHANNELS`, `EXAMPLE_CHANNELS`, `NOTIFICATIONS_CHANNELS`, each with a companion union type (e.g. `OrderChannel`).
- **SSE infrastructure** — `REALTIME_SSE_EVENT_NAMES` (tuple of the six SSE-delivered channels), `SseEventName`, `SseEventPayloadMap` (channel → payload interface), generic `SseEventPayload<T>`, and `SSE_EVENT_PAYLOAD_SCHEMAS` (JSON-Schema objects for client-side validation).

## Relationships

- **`src/types/index.ts`** — re-exports or references these generated types so the rest of the codebase imports event/channel definitions from a single barrel path rather than reaching into `contracts/` directly.

## Notes

- **Do not edit manually.** Any changes must be made in `asyncapi.yaml` and committed by re-running `npm run gen:asyncapi`.
- Interfaces use quoted single-letter keys (e.g. `'timestamp'`) and the `AnonymousSchemaNN` naming pattern; these artifacts come from the AsyncAPI generator and the `@typescript-eslint/naming-convention` rule is disabled for the file.
- `SSE_EVENT_PAYLOAD_SCHEMAS` embeds JSON-Schema objects as `Record<string, unknown>`; it is intended for runtime/client-side validation, not type-checking.
- The `notifications.created` payload uses a `oneOf` union of five concrete notification types; consumers must narrow on the `code` field.
- The `example.` namespace appears to be a placeholder/scaffolding channel.
