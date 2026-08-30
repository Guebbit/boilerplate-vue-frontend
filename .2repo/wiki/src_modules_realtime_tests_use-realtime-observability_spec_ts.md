# src/modules/realtime/tests/use-realtime-observability.spec.ts

## Purpose

Unit tests for the `useRealtimeObservability` composable that powers the observability dashboard. The SSE transport (`createSseClient`) is fully mocked so the tests verify only the wiring: which URL and event names are requested, which store action each event name dispatches to, and that the module-level singleton is torn down before a reconnection.

## Key elements

- **`loadComposable()`** — Calls `vi.resetModules()` then dynamically re-imports the composable and its Pinia store, guaranteeing a fresh module-level `activeClient` per test case.
- **`createSseClient` mock** — A `vi.fn` that returns `{ close }`. Parameter names are declared (with `_` prefix) so that `mock.calls` assertions are type-checked against the real `SseClientCallbacks` signature.
- **`close`** — A shared `vi.fn()` returned by every mocked client instance; tests assert on it to verify teardown.
- **`makeEvent(timestamp)`** — Factory producing a minimal valid `MetricsSnapshotEvent` payload.
- **`lastCallbacks()`** — Shortcut to the `onOpen` / `onError` / `onEvent` callbacks passed in the most recent `createSseClient` call.
- **Test groups** — `connect` (URL from `VITE_API_SSE` env or dev fallback, event-name list, "connecting" status, duplicate-connect safety), `transport callbacks` (onOpen → "open", onError → "error" + message), `event routing` (snapshot → `setSnapshot`, update → `setUpdate`, everything else → heartbeat; arrival-order preservation), `disconnect` (close + "closed" status, no-op safety, reconnect without double-close).

## Relationships

No graph neighbors are registered for this file. It exercises `@/modules/realtime/use-realtime-observability` and `@/modules/realtime/store` through dynamic imports, and mocks `@/infrastructure/create-sse-client`, but those edges are not tracked in the dependency graph.

## Notes

- **`vi.resetModules()` is load-bearing.** The composable keeps its SSE client in a module-scoped `activeClient`. Without a fresh module per case, a test inherits the previous test's open connection and reconnect assertions pass for the wrong reason.
- **Pinia is re-activated in `beforeEach`** via `setActivePinia(createPinia())`, so store state does not leak between cases.
- **`vi.unstubAllEnvs()`** runs in `afterEach` to clean up `vi.stubEnv('VITE_API_SSE', …)` calls.
- The test asserts that a `snapshot` event does **not** also set `latestHeartbeatAt` (early-return guard in the routing logic), and vice-versa.
- The `createSseClient` mock parameters are intentionally typed (not `...args: unknown`) so that any future change to the composable's call signature is caught at the type level in assertions rather than silently passing.
