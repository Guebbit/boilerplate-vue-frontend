# src/types/asyncapi.generated.ts

## Purpose

Auto-generated TypeScript type definitions derived from `asyncapi.yaml` via the AsyncAPI codegen tool. It provides compile-time typed interfaces for observability metrics payloads, canonical channel-name constants, and an SSE event-name → payload mapping so that consumers of the realtime API don't have to hand-write string literals or inline shapes.

## Key elements

- **`ObservabilityMetricsPayload`** – Top-level shape of a metrics event: `timestamp`, `uptimeSeconds`, and three nested objects (`memory`, `http`, `realtime`).
- **`AnonymousSchema3` / `AnonymousSchema8` / `AnonymousSchema11`** – Sub-interfaces for the `memory`, `http`, and `realtime` fields respectively. Their "AnonymousSchemaN" names are an artifact of the AsyncAPI spec using inline (unnamed) schemas.
- **`MetricsSnapshotEvent`** – Type alias equal to `ObservabilityMetricsPayload`; used as a semantic label at call sites.
- **`OBSERVABILITY_CHANNELS`** – `as const` object holding the three dot-notation channel names (`observability.metrics.snapshot`, `observability.metrics.updated`, `observability.heartbeat`).
- **`ObservabilityChannel`** – Union type of all values in `OBSERVABILITY_CHANNELS`.
- **`REALTIME_SSE_EVENT_NAMES`** – `as const` array mirroring the same three channel strings, but in array form for SSE dispatch.
- **`SseEventName`** – Union type extracted from `REALTIME_SSE_EVENT_NAMES`.
- **`SseEventPayloadMap`** – Record mapping each `SseEventName` string to its expected payload type (currently all three map to `ObservabilityMetricsPayload`).
- **`SseEventPayload<T>`** – Generic helper to extract the payload type for a given event name.

## Relationships

- **`scripts/generate-asyncapi-types.ts`** – The generator script that emits this file from `asyncapi.yaml`. Run via `npm run gen:asyncapi`.
- **`src/types/index.ts`** – Barrel file; re-exports the types and constants defined here so the rest of the codebase can import them from a single path.
- **`src/types/realtime.ts`** – Consumes `SseEventName`, `SseEventPayload`, and `ObservabilityMetricsPayload` to type the SSE connection layer.
- **`src/types/api.ts`** – Sibling type module; may reference or be cross-referenced with the observability payloads for REST endpoints that return the same metrics shape.
- **`github/workflows/ci.yml`** – CI pipeline that can invoke the generator and/or type-check to catch drift between `asyncapi.yaml` and this file.
- **`docs/api/asyncapi-workflow.md`** – Documents the AsyncAPI spec authoring and regeneration workflow that produces this file.

## Notes

- **Never edit by hand.** The header comment and the `eslint-disable` for naming-convention are there because the generator emits non-idiomatic names (e.g., `AnonymousSchema3`).
- The "AnonymousSchema" identifiers are not stable across spec edits—if a field is added or removed in `asyncapi.yaml`, the numeric suffixes may shift. Always regenerate rather than renaming.
- All three SSE events currently share the same payload type; the `SseEventPayloadMap` indirection exists so that future events can carry different shapes without changing the generic accessor.
- Channel names are **dot-delimited strings**, not nested object paths. Treat them as opaque identifiers when routing.
