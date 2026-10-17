---
source: src/modules/observability/tests/use-realtime-observability.spec.ts
sha256: 4c4a3b7be9b55472073175cd05b9e87707a6df3c2f8846a1fff2b53b55d053bf
generated_at: 2026-10-17T01:13:38.381802+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/use-realtime-observability.spec.ts

## Purpose

Unit tests for the `useRealtimeObservability` SSE composable. Rather than exercising a real `EventSource`, the tests mock `createSseClient` and assert the composable's wiring: which URL is opened, which event names are registered, how each event name is routed to a store action, and that the module-level singleton client is torn down before a second connection replaces it. The transport layer itself is covered separately in `tests/unit/infrastructure/create-sse-client.spec.ts`.

## Key elements

- **`createSseClient` (mocked fn)** — Stand-in for the real factory; returns an object exposing only `close`. Parameters are declared explicitly (not rest) so that `mock.calls` is typed as a 3-tuple, letting assertions on url, eventNames, and callbacks be type-safe.
- **`vi.mock('@/infrastructure/create-sse-client', …)`** — Module-level mock that routes all importers to the local `createSseClient` spy.
- **`close`** — Shared `vi.fn()` attached to every fake client instance; used to assert that a prior connection is closed before a new one opens.
- **`makeEvent(timestamp)`** — Returns a minimal valid `MetricsSnapshotEvent` payload accepted by all three event types.
- **`loadComposable()`** — Calls `vi.resetModules()` then dynamically re-imports `use-realtime-observability` and `store` so each test starts with `activeClient` undefined.
- **`lastCallbacks()`** — Convenience accessor for the third argument of the most recent `createSseClient` mock call.
- **`describe('connect')`** — Verifies URL resolution priority (`__APP_CONFIG.API_SSE` → `__APP_CONFIG.API_URL` → `VITE_API_SSE` → `VITE_API_URL`), the set of registered event names, `connecting` status, and singleton teardown on re-connect.
- **`describe('transport callbacks')`** — Verifies `onOpen` sets status to `open` and `onError` sets status to `error` with a human-readable message.
- **`describe('event routing')`** — Verifies each event name dispatches to the correct store action (`setSnapshot`, `setUpdate`, heartbeat) and appends a correctly-shaped entry to `store.entries`.

## Relationships

- **`src/modules/observability/use-realtime-observability.ts`** — The composable under test. Imported via `loadComposable()`; the test calls `connect()` and inspects the callbacks it passes to `createSseClient`.
- **`src/modules/observability/store.ts`** — Provides `useRealtimeObservabilityStore`; the test asserts against its `status`, `lastError`, `latestSnapshot`, `latestUpdate`, `latestHeartbeatAt`, and `entries` after each simulated event.

## Notes

- **`vi.resetModules()` is mandatory per test.** The composable holds `activeClient` at module scope. Without a fresh import, a test inherits the previous test's open connection, and reconnect assertions pass for the wrong reason.
- **URL resolution priority is a tested contract, not an implementation detail.** The test "a runtime-overridden API_URL wins over a build-time VITE_API_SSE" documents a real e2e multi-shard bug where a baked-in `VITE_API_SSE` would silently point every shard at the same backend. The expected priority is: `__APP_CONFIG.API_SSE` > `__APP_CONFIG.API_URL` + suffix > `VITE_API_SSE` > `VITE_API_URL` + suffix.
- **`close` is one shared mock, not per-instance.** This is intentional: the test only cares that `close` was called, not on which object.
- **Event-name order is not asserted.** The contract defines the set; the generated constant's order is implementation detail. Tests use `.toSorted()` before comparing.
