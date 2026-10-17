---
source: src/modules/observability/use-realtime-observability.ts
sha256: 964bf94c87fdb2e1304a310bd946a33ff2537f46d00f2e1cb8a70b45c795a087
generated_at: 2026-10-17T01:13:59.914260+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/use-realtime-observability.ts

## Purpose

Composable that manages a **module-level singleton** SSE connection for the observability dashboard. `connect` opens the stream and routes each typed event into the paired Pinia store's actions; `disconnect` tears it down. The singleton lives outside the composable closure so re-mounting the consuming component never opens a second stream.

## Key elements

- **`useRealtimeObservability`** (exported) — the composable. Returns `storeToRefs(store)` plus `connect` / `disconnect` controls.
- **`activeClient`** (module-level `let`) — holds the single `SseClient` instance; guarantees at most one active SSE connection process-wide.
- **`sseEndpoint()`** (module-level, unexported) — resolves the absolute SSE URL via a 4-step priority chain: runtime `API_SSE` override → runtime `API_URL`-derived → `VITE_API_SSE` build-time env → derived from the HTTP client's `baseURL`. Never falls back to a hardcoded URL.
- **`OBSERVABILITY_EVENT_NAMES`** — `Object.values(OBSERVABILITY_CHANNELS)`, passed to `createSseClient` to subscribe to every channel the stream emits.
- **`connect`** — closes any existing client, sets store status to `connecting`, then calls `createSseClient` with per-event handlers that dispatch to `store.setSnapshot` / `store.setUpdate` / `store.setHeartbeat` and append a feed entry.
- **`disconnect`** — closes the client, nulls `activeClient`, sets status to `closed`. Safe to call with no active connection.

## Relationships

- **`src/modules/observability/store.ts`** — the composable calls `useRealtimeObservabilityStore()` and drives its actions (`setStatus`, `setError`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `addEntry`) on every SSE event.
- **`src/modules/observability/tests/use-realtime-observability.spec.ts`** — unit/spec tests for this composable.
- **`src/modules/observability/views/RealtimePlayground.vue`** — the consuming Vue component that calls `useRealtimeObservability()` and renders the returned refs (status, feed, payloads).

## Notes

- **Singleton is process-wide, not per-component.** Two components calling the composable share one SSE connection; the second `connect()` call tears down the first.
- **Event routing is a closed set.** Only `observability.metrics.snapshot`, `observability.metrics.updated`, and a fallthrough "heartbeat" branch are handled. Any other event name that arrives will be treated as a heartbeat—add a new branch if a new event type is introduced.
- **Feed entry IDs are deterministic** (`snapshot-<ts>`, `update-<ts>`, `heartbeat-<ts>`). Dedup or keying logic in the store or view can rely on this format.
- **`sseEndpoint()` is resolved at call time, not import time**, so runtime config overrides (e.g., from a container's `config.js` or the e2e shard runner) are picked up without a rebuild.
