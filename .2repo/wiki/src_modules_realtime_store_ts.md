# src/modules/realtime/store.ts

## Purpose

Pinia setup-store that holds the live state of an SSE metrics stream for the observability dashboard — connection status, the two most recent payload shapes (full snapshot vs. incremental update), a heartbeat timestamp, a capped event feed, and the last error. It is intentionally pure state plus setters; the actual SSE connection is managed elsewhere (`use-realtime-observability.ts`), which calls the actions exported here.

## Key elements

- **`useRealtimeObservabilityStore`** — the single exported Pinia store (id: `realtime-observability`), defined in setup-store style.
- **`status`** (`RealtimeConnectionStatus`, default `'idle'`) — current lifecycle of the SSE connection.
- **`latestSnapshot`** (`MetricsSnapshotEvent | undefined`) — the full payload delivered when the stream first opens.
- **`latestUpdate`** (`MetricsSnapshotEvent | undefined`) — the most recent incremental metrics update.
- **`latestHeartbeatAt`** (`string | undefined`) — ISO timestamp of the last heartbeat; lets the UI distinguish a quiet-but-open stream from a stalled one.
- **`entries`** (`RealtimeMetricsEntry[]`) — rolling feed of recent events, capped at 100.
- **`lastError`** (`string | undefined`) — human-readable error message for UI display.
- **`setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `setError`** — one-liner setters for the corresponding refs.
- **`addEntry(entry)`** — appends to `entries` and slices to the last 100 items, preventing unbounded growth on long-lived streams.

## Relationships

No dependency-graph neighbors are recorded for this file. It is consumed by the connection composable (`use-realtime-observability.ts`) and by dashboard UI components that read the reactive state.

## Notes

- The store is **stateless with respect to the network**: it never opens a socket or fires a request. All mutations come from the calling composable.
- `addEntry` replaces the `entries` array (spread + `slice`) rather than mutating in place, which is what makes Vue reactivity pick up the change.
- `latestSnapshot` and `latestUpdate` share the same type (`MetricsSnapshotEvent`) but represent different semantic stages of the stream (initial full payload vs. subsequent delta). Don't conflate them when reading UI logic.
- The 100-entry cap is hardcoded in `addEntry`; there is no configurable option.
