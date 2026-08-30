# src/modules/realtime/store.ts

## Purpose

Pinia store that holds the reactive UI state for the real-time observability dashboard: SSE connection lifecycle, the two latest payload shapes (initial snapshot vs. incremental update), a heartbeat timestamp, a capped event feed, and the last error. It is pure state plus setter actions — it never opens or manages the SSE connection itself; that responsibility belongs to the composable in `use-realtime-observability.ts`, which calls the store's actions.

## Key elements

- **`useRealtimeObservabilityStore`** (exported, Pinia store id `realtime-observability`) — the single store instance for the dashboard.
- **State refs**
  - `status: RealtimeConnectionStatus` — current lifecycle (`idle`, `connecting`, `open`, `closed`, …).
  - `latestSnapshot: MetricsSnapshotEvent | undefined` — full metrics payload sent when the stream opens.
  - `latestUpdate: MetricsSnapshotEvent | undefined` — most recent incremental update.
  - `latestHeartbeatAt: string | undefined` — timestamp of the last heartbeat (distinguishes quiet from stalled).
  - `entries: RealtimeMetricsEntry[]` — rolling feed, newest-first, capped at 100.
  - `lastError: string | undefined` — human-readable message of the most recent stream failure.
- **Actions (setters)**
  - `setStatus(nextStatus)` — overwrites `status`.
  - `setSnapshot(snapshot)` — overwrites `latestSnapshot`.
  - `setUpdate(update)` — overwrites `latestUpdate`.
  - `setHeartbeat(heartbeat)` — stores only `heartbeat.timestamp` into `latestHeartbeatAt`.
  - `addEntry(entry)` — appends to `entries`, keeping the last 100 via `.slice(-100)`.
  - `setError(error)` — overwrites `lastError`.

## Relationships

- **`src/modules/realtime/use-realtime-observability.ts`** — Owns the SSE connection lifecycle. It imports this store and calls its actions (`setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `addEntry`, `setError`) in response to events from the client. This file is the *consumer* of the store.
- **`src/infrastructure/create-sse-client.ts`** — Provides the low-level SSE transport. `use-realtime-observability.ts` wires the client's events into the store; the store itself does not import this module.
- **`docs/api/asyncapi-workflow.md`** — Documents the event shapes (`MetricsSnapshotEvent`, `RealtimeMetricsEntry`) and the SSE protocol that this store's state mirrors. Useful as the canonical reference for the types imported from `@types`.
- **`docs/index.md`** — Top-level docs entry point; links to the observability/realtime section where this module is described at a higher level.

## Notes

- The store is intentionally **passive**: no `onMounted`, no timer, no fetch. If you find side-effects here, they likely don't belong.
- `addEntry` re-creates the array on every call (`[...entries.value, entry].slice(-100)`) to trigger Vue reactivity. For very high-frequency streams this allocates a new array per event; the 100-entry cap is the only guard.
- `latestSnapshot` and `latestUpdate` are intentionally separate slots so the UI can render "initial state" and "delta" independently even when both are present.
- All types come from the `@types` alias — verify against `docs/api/asyncapi-workflow.md` before assuming a field name or shape.
