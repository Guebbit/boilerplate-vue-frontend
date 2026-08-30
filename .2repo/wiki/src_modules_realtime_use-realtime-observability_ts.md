# src/modules/realtime/use-realtime-observability.ts

## Purpose

Composable that owns a **module-level singleton** SSE connection for the realtime observability dashboard. It opens the stream, routes each typed event to the paired Pinia store's actions, and exposes `connect`/`disconnect` controls. The singleton lives outside the composable's closure so that re-mounting a consuming component never opens a second stream.

## Key elements

- **`activeClient`** (module-level `let`) — holds the single live SSE client instance; set by `connect`, cleared by `disconnect`. Prevents duplicate connections across component re-mounts.
- **`useRealtimeObservability()`** (exported composable) — returns:
  - `storeToRefs(store)` spread: reactive refs for `status`, `latestSnapshot`, `latestUpdate`, `latestHeartbeat`, `feed`, `lastError`, etc.
  - `connect()` — closes any prior client, sets status to `connecting`, then creates a new SSE client via `createSseClient`. Routes events by name:
    - `observability.metrics.snapshot` → `store.setSnapshot` + feed entry (`kind: 'snapshot'`)
    - `observability.metrics.updated` → `store.setUpdate` + feed entry (`kind: 'update'`)
    - *anything else* → treated as heartbeat → `store.setHeartbeat` + feed entry (`kind: 'heartbeat'`)
  - `disconnect()` — closes the client, nulls `activeClient`, sets status to `closed`. Safe to call when no connection is open.

## Relationships

- **`src/modules/realtime/store.ts`** — Imports `useRealtimeObservabilityStore`. All event routing and status/error updates are delegated to that store's actions (`setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `setError`, `addEntry`). This file is the *producer*; the store is the *consumer*.
- **`docs/api/asyncapi-workflow.md`** — Documents the AsyncAPI event schema for the SSE stream. The event names consumed here (`observability.metrics.snapshot`, `observability.metrics.updated`, heartbeat) and their payload shapes are defined in that spec.

## Notes

- **Singleton is not reactive.** `activeClient` is a plain module-level variable, not a `ref`. Components cannot observe "is a connection open?" through reactivity; they must rely on `store.status`.
- **Fallback endpoint.** When `VITE_API_SSE` is unset, the client targets `http://localhost:3000/observability/events`.
- **Catch-all heartbeat.** Any event name that is neither `snapshot` nor `updated` is silently classified as a heartbeat. A future event type added to the AsyncAPI spec will be misfiled unless the routing logic is updated.
- **Feed entry IDs** are derived from the payload's `timestamp` field (`snapshot-…`, `update-…`, `heartbeat-…`), so duplicate timestamps from the server would produce colliding IDs.
