---
source: src/modules/observability/store.ts
sha256: 6246f64eda730a920977f7e134f85c234d504aa90fa660e806731fed68ab3ca7
signature: d73e1c1395ed17c43cbdee70758a5d0361a3f6f3e2f1cd3bc8359d71fe3b02f8
generated_at: 2026-11-10T04:52:43.812032+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/store.ts

## Purpose

Pinia store that holds the reactive state of the live Server-Sent Events (SSE) metrics stream for the observability dashboard. It stores connection status, the two most recent payload shapes (snapshot and incremental update), a timestamped heartbeat, a capped event feed, and the last error. The file is intentionally state-and-setters only; the SSE connection logic lives in `use-realtime-observability.ts`, which calls the store's actions.

## Key elements

- **`useObservabilityRealtimeStore`** — the single export; a Pinia setup-style store (`defineStore('observability-realtime', …)`) returning all state refs and action functions.
- **State refs**
  - `status` (`RealtimeConnectionStatus`) — current SSE lifecycle state (`idle`, `connecting`, `open`, `closed`, …).
  - `latestSnapshot` (`MetricsSnapshotEvent | undefined`) — full snapshot received when the stream opens.
  - `latestUpdate` (`MetricsSnapshotEvent | undefined`) — most recent incremental metrics update.
  - `latestHeartbeatAt` (`string | undefined`) — timestamp of the last heartbeat event; distinguishes "quiet but alive" from "stalled".
  - `entries` (`RealtimeMetricsEntry[]`) — rolling feed of events, capped at 100.
  - `lastError` (`string | undefined`) — human-readable error message for UI display.
- **Actions**
  - `setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `setError` — simple setters for the corresponding refs.
  - `addEntry(entry)` — appends to `entries` then slices to the last 100 items (immutably replaces the array).

## Relationships

- **`src/modules/observability/types.ts`** — source of the `RealtimeConnectionStatus` and `RealtimeMetricsEntry` types used by the store's refs and actions.
- **`src/modules/observability/use-realtime-observability.ts`** — the SSE composable that owns the connection; it imports and calls the store's actions (`setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `addEntry`, `setError`) to push server events into this store.
- **`src/modules/observability/tests/store.spec.ts`** — unit tests for the store's actions and state transitions.
- **`src/modules/observability/tests/use-realtime-observability.spec.ts`** — integration tests that exercise the composable → store flow.

## Notes

- `addEntry` performs a spread-and-slice (`[...entries.value, entry].slice(-100)`) rather than a push + shift, so it always produces a new array reference (relevant for Pinia reactivity and Vue watchers).
- `setHeartbeat` accepts a full `MetricsSnapshotEvent` but only stores its `timestamp` field; the rest of the event is discarded.
- The store is pure state — it never opens, closes, or re-tries a connection. All lifecycle control is the composable's responsibility.
