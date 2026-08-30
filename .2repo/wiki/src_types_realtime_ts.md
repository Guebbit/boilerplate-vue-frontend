# src/types/realtime.ts

## Purpose

Defines the TypeScript types for the realtime observability SSE feed: the shape of a single rendered feed entry and the lifecycle states of the underlying connection. This file centralises the client-facing contract so UI and infrastructure code share one source of truth for what a "realtime metric" looks like and what states a connection can be in.

## Key elements

- **`RealtimeMetricsEntry`** (interface) — A single rendered SSE feed entry. Fields: `id`, `kind` (`'snapshot' | 'update' | 'heartbeat'`), `timestamp`, and `payload` (typed as `ObservabilityMetricsPayload`). The `kind` union discriminates the three named metrics events for distinct styling/labeling in the UI.
- **`RealtimeConnectionStatus`** (type alias) — Five-state union: `'idle' | 'connecting' | 'open' | 'closed' | 'error'`, representing the full lifecycle of an SSE connection.

## Relationships

- **`src/types/asyncapi.generated.ts`** — Provides the `ObservabilityMetricsPayload` type used as the `payload` field of `RealtimeMetricsEntry`. This file is a pure consumer of that generated type.
- **`src/infrastructure/create-sse-client.ts`** — The SSE client implementation that consumes both exports: it emits `RealtimeMetricsEntry` objects and tracks its own state as `RealtimeConnectionStatus`.
- **`src/types/index.ts`** — Barrel re-export; makes both types available to the rest of the codebase under the `types` entry point.
- **`docs/api/asyncapi-workflow.md`** — Documents the AsyncAPI spec that the `kind` values and payload shape are derived from; the types here are the client-side reflection of that contract.

## Notes

- This file is type-only (`import type`); it introduces no runtime code.
- `kind` is a closed three-member union tied to the AsyncAPI event names. Adding a new event type in the spec requires updating both the generated payload type and this union.
- `timestamp` is a plain `string`, not a `Date` — callers are responsible for parsing.
