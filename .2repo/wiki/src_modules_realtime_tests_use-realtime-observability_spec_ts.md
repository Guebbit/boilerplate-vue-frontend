# src/modules/realtime/tests/use-realtime-observability.spec.ts

## Purpose

Unit tests for the `useRealtimeObservability` SSE composable. They verify the wiring layer—URL resolution, event-name-to-store-action routing, singleton teardown/replacement, and disconnect safety—by mocking `createSseClient` rather than exercising a real `EventSource`. The transport internals are covered separately in `tests/unit/infrastructure/create-sse-client.spec.ts`.

## Key elements

- **`createSseClient` (mock)** — A `vi.fn` that returns `{ close }` for every call. Declared with typed parameters so that `mock.calls` assertions on URL, event-name array, and callbacks are type-checked.
- **`loadComposable()`** — Calls `vi.resetModules()` then dynamically re-imports the composable and its Pinia store. Guarantees the module-scoped `activeClient` starts `undefined` for each test.
- **`close`** — A shared `vi.fn()` instance attached to every mocked client so call-count assertions work across connect/disconnect/reconnect scenarios.
- **`makeEvent(timestamp)`** — Factory returning a minimal `MetricsSnapshotEvent` payload accepted by all three event kinds.
- **`lastCallbacks()`** — Helper extracting the callbacks argument from the most recent `createSseClient` call, used to invoke `onOpen`, `onError`, and `onEvent`.
- **Test suites**: `connect` (URL from env/fallback, connecting status, double-connect guard), `transport callbacks` (open/error status + `lastError` message), `event routing` (snapshot → `setSnapshot`, update → `setUpdate`, heartbeat fallback, feed ordering), `disconnect` (close, idempotent no-op, reconnect without double-close).

## Relationships

- **`src/modules/realtime/use-realtime-observability.ts`** — The module under test. This spec imports its `useRealtimeObservability` factory and the co-located `useRealtimeObservabilityStore` (re-exported from the same module graph) to drive and assert state transitions.
- **`@/infrastructure/create-sse-client`** — Mocked at the module level via `vi.mock`; only the `createSseClient` export is faked.
- **`@/modules/realtime/store`** — Re-imported alongside the composable in `loadComposable` to read Pinia state (`status`, `latestSnapshot`, `latestUpdate`, `latestHeartbeatAt`, `entries`, `lastError`).

## Notes

- **Mandatory `vi.resetModules()` per test.** Because `activeClient` lives at module scope inside the composable, skipping the reset makes a test inherit the previous test's open connection, causing reconnect assertions to pass for the wrong reason.
- **`vi.stubEnv` / `vi.unstubAllEnvs`** pair: `beforeEach` clears all mocks; `afterEach` un-stubs `VITE_API_SSE`. Forgetting the unstub leaks the env value into subsequent tests.
- **Typed mock parameters are intentional.** The underscore-prefixed params exist solely so TypeScript infers `Parameters<typeof createSseClient>` on `mock.calls`, making argument-order assertions a compile-time guarantee.
- **Event routing is exhaustive with an else-branch.** `snapshot` and `updated` are matched explicitly; any other event name (including `observability.heartbeat`) falls through to the heartbeat path. Tests verify that the non-matching store fields remain `undefined` to catch cross-contamination.
