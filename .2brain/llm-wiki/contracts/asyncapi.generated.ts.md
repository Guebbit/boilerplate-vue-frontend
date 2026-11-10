---
source: contracts/asyncapi.generated.ts
sha256: 33867e8b9ae532500684659b2180615293569610272985166bb7499bc3fc2646
signature: 050af71218033598dcad25fe777b4ec5f8e3ca42d438a48cc46b66a1a66efeba
generated_at: 2026-11-10T02:10:19.855426+00:00
model: ollama:qwen3.8:27b
---

# contracts/asyncapi.generated.ts

## Purpose
Auto-generated TypeScript type definitions for all AsyncAPI event envelopes, payloads, and discriminants described in the project's AsyncAPI specification. It exists to give the codebase a typed contract for every published domain event (orders, shipments, payments, disputes, returns, user lifecycle, notifications) without hand-writing interfaces.

## Key elements
- **Event envelope interfaces** (`*Envelope`) — uniform `{ type, timestamp, data }` shape for each domain event, such as `OrderCreatedEnvelope`, `PaymentSucceededEnvelope`, `ShipmentLostEnvelope`, `ReturnClosedEnvelope`, `UserErasedEnvelope`.
- **Event-type discriminant aliases** (`*EventType`) — literal string unions (e.g. `OrderCreatedEventType = "order.created"`) used as the `type` discriminator in each envelope.
- **Payload interfaces** (`*Payload`) — typed `data` bodies per event, such as `PaymentRefundedPayload`, `ShipmentPayload`, `ReturnRequestedPayload`, `PaymentDisputePayload`.
- **Literal union types for enums** — `OrderCancelCause`, `UserChangedField`, and generator-produced aliases like `AnonymousSchema27`, `AnonymousSchema72`, `AnonymousSchema75` that stand in for inline enum or object definitions in the source YAML.
- **`NotificationCreatedPayload`** — a single discriminated union over ~25 `Notification*Payload` interfaces (staff tasks, outbox dead-letter, fulfillment holds, stock alerts, etc.).
- **`ObservabilityMetricsPayload`** — snapshot shape for uptime, memory, HTTP, and realtime-SSE metrics.
- **Imported shared types** — `RefundFailureReason`, `DisputeKind`, `DisputeStatus`, `DisputeReason`, `ReturnReason`, `ReturnStatementChannel`, `ReturnRemedy` from `./rest/index`.

## Relationships
- **`contracts/rest/index.ts`** — this file imports seven shared domain-literal types from it, so REST and AsyncAPI contracts share the same enum definitions (such as `DisputeKind`, `ReturnReason`).
- **`scripts/contracts/generate-asyncapi-types.ts`** — the generator script that emits this file; running `npm run gen:asyncapi` overwrites it.
- **`src/types/index.ts`** — listed as a consumer/re-export point; application code accesses these envelope and payload types through the central types barrel rather than importing this file directly.

## Notes
- **Do not edit manually.** The header and `/* eslint-disable */` comment enforce this; any change will be lost on the next `npm run gen:asyncapi`.
- **`AnonymousSchema` names** (e.g. `AnonymousSchema27`, `AnonymousSchema72`, `AnonymousSchema75`) are artifacts of the generator (inline `$ref` schemas in the YAML with no named anchor). They are stable as long as the YAML schema ordering does not change, but they carry no semantic meaning—treat them as opaque aliases.
- **Naming convention** is disabled for this file (`@typescript-eslint/naming-convention`); the generated property names (such as `orderId`, `heapUsed`) follow the YAML property names verbatim and may mix cases.
- **Optional fields** use `?` (such as `evidenceDueBy?`, `statedVia?`, `remedy?`); always guard for `undefined` when consuming.
- **`type` discriminants are literal strings**, not numeric codes; switch on them with exact string matches.
