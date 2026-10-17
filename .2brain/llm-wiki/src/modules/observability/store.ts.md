---
source: src/modules/observability/store.ts
sha256: c7b2a1c3824189a3af4723cd443b7637b4ad3f98aaffdf5f9628b6a32c36ce96
generated_at: 2026-10-17T01:11:50.291107+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/store.ts

## Purpose

Pinia store (setup syntax) that holds the live SSE connection state for the observability dashboard: connection lifecycle status, the two most recent payload shapes (full snapshot vs. incremental update), a heartbeat timestamp, a capped event feed, and the last error. It is pure state plus setter actions — the SSE connection itself is managed in `use-realtime-observability.ts`, which calls these actions.

## Key elements

- **`useRealtimeObservabilityStore`** – the exported Pinia store (`'realtime-observability'`), defined with setup-store syntax (`defineStore` + `ref`).
- **State refs** – `status`, `latestSnapshot`, `latestUpdate`, `latestHeartbeatAt`, `entries`, `lastError`. All are `ref`s returned directly from the store.
- **`setStatus`** – sets the SSE connection status (e.g. `idle`, `connecting`, `open`, `closed`).
- **`setSnapshot`** – stores the full metrics snapshot received when the stream opens.
- **`setUpdate`** – stores the most recent incremental metrics update.
- **`setHeartbeat`** – records only the `timestamp` field of a heartbeat event, enabling "quiet vs. stalled" detection.
- **`addEntry`** – appends to the feed and immediately trims to the last **100** entries via `slice(-100)`.
- **`setError`** – records a human-readable error string for UI display.

## Relationships

- **`src/modules/observability/types.ts`** – provides the `RealtimeConnectionStatus` and `RealtimeMetricsEntry` types used as generics for refs and parameters.
- **`@types` (project-wide)** – provides `MetricsSnapshotEvent`, the payload shape shared by snapshot, update, and heartbeat setters.
- **`src/modules/observability/use-realtime-observability.ts`** – the composable that owns the SSE connection lifecycle; it calls this store's actions (`setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `addEntry`, `setError`) as events arrive.
- **`src/modules/observability/tests/store.spec.ts`** – unit tests for the store's state and actions.
- **`src/modules/observability/tests/use-realtime-observability.spec.ts`** – integration tests that exercise the store through the connection composable.

## Notes

- `latestSnapshot` and `latestUpdate` are the **same type** (`MetricsSnapshotEvent`) but represent different stream lifecycle moments (initial full payload vs. subsequent deltas). Consumers should not assume they are interchangeable.
- The 100-entry cap in `addEntry` is the **only** memory bound; there is no explicit `clearEntries` action, so the feed is never reset until the component unmounts or a new entry pushes the oldest out.
- The store uses setup-store syntax (refs + functions) rather than Pinia's options syntax; all state and actions are returned in a flat object.
