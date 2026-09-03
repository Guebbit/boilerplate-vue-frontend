# src/types/realtime.ts

## Purpose

Defines the TypeScript types that describe the realtime observability SSE feed: the shape of an individual rendered event entry and the lifecycle states of the underlying connection. It exists so that consumers of the feed (rendering components, status indicators) share a single, typed contract without importing the full generated AsyncAPI schema.

## Key elements

- **`RealtimeMetricsEntry`** (interface) — Represents one SSE event as a feed row. Fields: `id` (render key), `kind` (`'snapshot' | 'update' | 'heartbeat'`), `timestamp` (ISO string), and `payload` (the typed metrics data).
- **`RealtimeConnectionStatus`** (type alias) — A five-state union (`'idle' | 'connecting' | 'open' | 'closed' | 'error'`) describing the SSE connection lifecycle from not-started through failure.

## Relationships

- **`src/types/asyncapi.generated.ts`** — `RealtimeMetricsEntry.payload` is typed as `ObservabilityMetricsPayload`, imported from this generated file. This file therefore depends on the AsyncAPI schema being kept in sync.
- **`src/types/index.ts`** — Barrel file that re-exports both types so downstream modules can import them from the package root.

## Notes

- The `kind` union (`'snapshot' | 'update' | 'heartbeat'`) is intentionally a closed set of three values matching the named metrics events; adding a new event type requires updating this union *and* the corresponding AsyncAPI schema.
- `timestamp` is an ISO string, not a `Date` object — formatting is the consumer's responsibility.
- This module is purely declarative (no runtime code); safe to import in any context including SSR.
