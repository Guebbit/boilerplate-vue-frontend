---
source: src/modules/observability/use-realtime-observability.ts
sha256: 2524b1a46712edee3b5ec3c7aad18bff2025737644d91a29a01f27b718851750
signature: deb2fa07dbcf03530aba9d5a0234ffe99ca733fbcc046b3cfd1316a1030a0d4a
generated_at: 2026-11-10T04:56:54.877123+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/use-realtime-observability.ts

## Purpose

Composable that manages a single SSE (Server-Sent Events) connection for the observability dashboard. It exposes `connect`/`disconnect` controls and routes each typed event into the paired Pinia store. The connection lives in a module-level singleton so re-mounting the consuming component never opens a duplicate stream.

## Key elements

- **`useRealtimeObservability()`** — The exported composable. Returns `storeToRefs(store)` spread (status, latest payloads, feed, last error) plus `connect()` and `disconnect()`.
- **`activeClient`** — Module-level `let` singleton (`ReturnType<typeof createSseClient> | undefined`). Only one SSE connection can be active process-wide regardless of how many component instances call the composable.
- **`sseEndpoint()`** — Resolves the absolute SSE URL with a four-step priority: runtime `API_SSE` override → runtime `API_URL` override (derives from `instance.defaults.baseURL`) → build-time `VITE_API_SSE` → derived from the REST base URL. Never returns an empty string.
- **`OBSERVABILITY_EVENT_NAMES`** — Derived from `Object.values(OBSERVABILITY_CHANNELS)`; passed to `createSseClient` as the accepted event-name filter.
- **`connect()`** — Closes any prior client, sets store status to `'connecting'`, creates a new SSE client, and wires `onOpen`/`onError`/`onEvent` callbacks. `onEvent` dispatches on event name: `observability.metrics.snapshot` → `store.setSnapshot` + feed entry; `observability.metrics.updated` → `store.setUpdate` + feed entry; anything else → `store.setHeartbeat` + feed entry.
- **`disconnect()`** — Closes the active client, nulls the singleton, sets store status to `'closed'`. Safe to call with no connection open.

## Relationships

- **`src/modules/observability/store.ts`** — The composable pulls `useObservabilityRealtimeStore` and delegates all state mutation (status, snapshot, update, heartbeat, feed entries, error) to that store's actions. The store owns the data; this file only transports events into it.
- **`src/modules/observability/views/RealtimePlayground.vue`** — The consuming component. Calls `useRealtimeObservability()` to get reactive refs and the `connect`/`disconnect` lifecycle controls for the dashboard UI.
- **`src/modules/observability/tests/use-realtime-observability.spec.ts`** — Unit test for the composable's connect/disconnect/event-routing behavior.

## Notes

- The singleton pattern means calling `connect()` a second time (e.g., after a component remount) silently replaces the old connection. There is no guard against concurrent in-flight connections — the second call wins.
- `sseEndpoint()` deliberately checks `runtimeValue('API_URL')` before `VITE_API_SSE`. This is what lets one build bundle serve multiple e2e shards, each pointing at its own demo backend. Reordering these checks would break the shard setup.
- The `onEvent` handler treats any event that is *not* explicitly `snapshot` or `updated` as a heartbeat. If the backend adds a new event type, it will silently land in the heartbeat path until the composable is updated.
- Feed entry IDs are `kind-timestamp` strings (e.g., `snapshot-1717000000`). They rely on `payload.timestamp` being present and unique per event; a missing timestamp would produce `undefined` in the ID.
