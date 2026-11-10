---
source: src/modules/observability/tests/use-realtime-observability.spec.ts
sha256: 5194d33224125468f643074f44736b4f7a98b1d82507d83cbcd170f3c8da3cd5
signature: ff4930c160264f98b3f1a588ab4b1134ca08e39997a725adc7031b1a04931db1
generated_at: 2026-11-10T04:56:28.936881+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/use-realtime-observability.spec.ts

## Purpose

Unit tests for the `useRealtimeObservability` SSE composable. The file verifies wiring only — which URL `connect()` opens, which store action each SSE event name dispatches to, and that the module-level singleton is torn down before a second connection replaces it. The SSE transport itself is exercised in `tests/unit/infrastructure/create-sse-client.spec.ts`; here `createSseClient` is fully mocked.

## Key elements

- **`createSseClient`** (`vi.fn`) — Mock factory returning `{ close }`. Declares `(url, eventNames, callbacks)` params (ignored in the body) so that `mock.calls` is typed with the real argument tuple, letting assertions on what the composable *passed* be type-checked.
- **`close`** (`vi.fn`) — Shared close method every mocked SSE client instance returns; asserted to verify singleton teardown on re-connect.
- **`makeEvent(timestamp)`** — Returns a minimal `MetricsSnapshotEvent` payload accepted by all three event kinds (snapshot, update, heartbeat).
- **`loadComposable()`** — Calls `vi.resetModules()` then dynamically imports `../use-realtime-observability` and `../store` together, guaranteeing the module-scope `activeClient` starts `undefined` for each test.
- **`lastCallbacks()`** — Shorthand for the callbacks argument of the most recent `createSseClient` call, used to drive `onOpen`, `onError`, and `onEvent`.
- **`describe('connect')`** — Asserts URL resolution priority (env → runtime `__APP_CONFIG` → build-time `VITE_API_SSE`), event-name set, `connecting` status, and that a second `connect()` closes the first client.
- **`describe('transport callbacks')`** — Drives `onOpen` / `onError` through the mocked callbacks and checks `store.status` and `store.lastError`.
- **`describe('event routing')`** — Feeds each of the three SSE event names through `onEvent` and asserts the correct store action (`setSnapshot`, `setUpdate`, heartbeat) fires, the correct `entries` record is appended, and no cross-contamination between kinds.

## Relationships

- **`src/modules/observability/use-realtime-observability.ts`** — System under test. The composable's `connect()` is invoked and its returned transport callbacks are driven directly.
- **`src/modules/observability/store.ts`** — The Pinia store whose state (`status`, `latestSnapshot`, `latestUpdate`, `latestHeartbeatAt`, `entries`, `lastError`) is the primary assertion target for every routing and lifecycle case.

## Notes

- **`vi.resetModules()` is non-negotiable.** `activeClient` is a module-scope singleton in `use-realtime-observability.ts`. Skipping the reset lets a test inherit the previous test's open connection, making reconnect/close assertions pass for the wrong reason.
- **URL priority is a regression guard, not just a unit detail.** The `__APP_CONFIG`-over-`VITE_API_SSE` test documents a real e2e-shard bug: every shard build bakes in the same `.env` value, and only the shard runner's `API_URL` override differentiates them. A fallback checked before that override would silently point all shards at one backend.
- **The `createSseClient` mock ignores its parameters intentionally.** The underscore-prefixed args exist solely to widen the `mock.calls` type from `[]` to the real 3-tuple so assertions on the *passed* URL, event names, and callbacks are compile-time checked.
- **Event-name ordering is irrelevant.** The test sorts the received names before comparing (`toSorted()`), reflecting that the contract defines a set, not an ordered list.
