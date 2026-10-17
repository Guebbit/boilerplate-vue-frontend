---
source: src/modules/observability/tests/store.spec.ts
sha256: 220310229764b599877934565a81b6b9fd978bb9139c432a906a077dc25f4ee8
generated_at: 2026-10-17T01:13:02.589357+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/store.spec.ts

## Purpose

Unit tests for the `useRealtimeObservabilityStore` Pinia store, verifying that each action (`setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `setError`) mutates state correctly and that the store initialises to a clean "idle" state. Each test runs against a freshly created Pinia instance to prevent state leakage between cases.

## Key elements

- **`makeSnapshot(timestamp)`** – local helper that builds a minimal valid `MetricsSnapshotEvent` object (with `memory`, `http`, `realtime` sub-objects) so tests don't need to spell out the full shape each time.
- **`beforeEach`** – calls `setActivePinia(createPinia())` before every test, guaranteeing an isolated store instance.
- **Initial-state test** – asserts `status === 'idle'` and that `latestSnapshot`, `latestUpdate`, `latestHeartbeatAt`, `lastError` are all `undefined`.
- **`setStatus` test** – transitions through `'connecting'` → `'open'` and asserts the stored value.
- **`setSnapshot` / `setUpdate` tests** – confirm the passed payload is stored verbatim on the corresponding state field.
- **`setHeartbeat` test** – verifies only the `timestamp` string is extracted into `latestHeartbeatAt` and that `latestSnapshot` / `latestUpdate` remain untouched.
- **`setError` test** – confirms the message string lands in `lastError`.
- **Overwrite test** – calls `setSnapshot` twice and asserts the second value replaces the first.

## Relationships

- **`src/modules/observability/store.ts`** – the system under test; this file imports `useRealtimeObservabilityStore` from it and exercises its actions and initial state.
- **`pinia`** – provides `createPinia` / `setActivePinia` used to build the isolated test instance.
- **`@types`** – supplies the `MetricsSnapshotEvent` type that `makeSnapshot` conforms to.
- **`vitest`** – test runner (`describe`, `it`, `expect`, `beforeEach`).

## Notes

- `makeSnapshot` is reused for the heartbeat test even though `setHeartbeat` only reads `timestamp`; the full object is passed to mirror the real payload shape the store receives over SSE.
- The overwrite test only covers `setSnapshot`; the other setter actions are assumed to follow the same last-write-wins pattern (no dedicated test per action).
- No async / streaming logic is tested here—only synchronous state mutations. SSE connection handling (if any) lives elsewhere.
