---
source: contracts/asyncapi.generated.ts
sha256: 9a5ba8ef559c7670e2fafd5d7a2e30225b95e818586caabf449bfb5b0cc5e173
generated_at: 2026-10-02T11:18:09.694932+00:00
model: ollama:qwen3.8:27b
---

# contracts/asyncapi.generated.ts

## Purpose

Auto-generated TypeScript types, channel-name constants, and SSE payload schemas derived from the project's `asyncapi.yaml` spec. It exists so that event producers, consumers, and the real-time SSE layer share a single source of truth for channel identifiers and payload shapes without hand-maintaining them.

## Key elements

- **Event envelope interfaces** (`OrderCreatedEnvelope`, `PaymentSucceededEnvelope`, `ReturnRequestedEnvelope`, etc.) — each carries a discriminant `type` literal, a `timestamp`, and a domain-specific `data` payload.
- **Domain payload interfaces** (`OrderIdPayload`, `PaymentEventPayload`, `ReturnClosedPayload`, etc.) — the concrete data objects nested inside envelopes.
- **Event type aliases** (`OrderCreatedEvent`, `PaymentFailedEvent`, `HeartbeatEvent`, …) — one-line aliases that map a logical event name to its envelope/payload interface for ergonomic imports.
- **Channel-name constants** (`OBSERVABILITY_CHANNELS`, `ORDER_CHANNELS`, `PAYMENT_CHANNELS`, `RETURN_CHANNELS`) — `as const` objects holding the canonical channel strings from the AsyncAPI spec.
- **Channel union types** (`ObservabilityChannel`, `OrderChannel`, `PaymentChannel`, `ReturnChannel`) — `typeof`-derived unions of the values in the corresponding constants object.
- **`ObservabilityMetricsPayload`** and its sub-interfaces (`MemoryUsage`, `HttpMetrics`, `RealtimeMetrics`) — the shared shape used by all three observability channels.
- **SSE definitions** — `REALTIME_SSE_EVENT_NAMES` (const tuple), `SseEventName` (union), `SseEventPayloadMap` (channel→payload mapping), `SseEventPayload<T>` (generic accessor), and `SSE_EVENT_PAYLOAD_SCHEMAS` (JSON-Schema objects per SSE event for runtime validation).

## Relationships

- **`src/types/index.ts`** — downstream consumer; re-exports or imports the interfaces, channel constants, and SSE types defined here to provide a unified type surface to the rest of the codebase.

## Notes

- **Do not edit manually.** All content is produced by `npm run gen:asyncapi` from `asyncapi.yaml`. To change types or channels, edit the YAML spec and regenerate.
- Event type aliases (e.g. `OrderCreatedEvent`) are plain `type` aliases to their envelope interface—there is no additional runtime value.
- The SSE layer currently covers **only** the `observability.*` namespace. Order, payment, and return channels are typed here for messaging/event-bus consumers but are not part of the SSE event map.
- `SSE_EVENT_PAYLOAD_SCHEMAS` duplicates the TypeScript interfaces as JSON-Schema objects; they are intended for runtime validation (e.g. `ajv`) rather than compile-time use.
- Channel-name strings (e.g. `'order.created'`) are the canonical identifiers from the AsyncAPI spec and must match exactly across producers and consumers.
