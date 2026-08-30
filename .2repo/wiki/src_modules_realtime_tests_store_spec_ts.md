# src/modules/realtime/tests/store.spec.ts

## Purpose

Vitest unit-test suite for the `useRealtimeObservabilityStore` Pinia store. It verifies the store's initial state and each setter action (`setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `setError`) against a fresh Pinia instance per test.

## Key elements

- **`makeSnapshot(timestamp)`** – Local factory returning a minimal valid `MetricsSnapshotEvent` (fixed numeric fields, variable timestamp). Reused across tests as the payload for snapshot, update, and heartbeat calls.
- **`beforeEach`** – Calls `setActivePinia(createPinia())` so every test starts from a clean store.
- **Initial-state test** – Asserts `status === 'idle'` and that `latestSnapshot`, `latestUpdate`, `latestHeartbeatAt`, and `lastError` are all `undefined`.
- **`setStatus` test** – Sets `'connecting'` then `'open'`, asserting the value round-trips.
- **`setSnapshot` / `setUpdate` tests** – Store the full `MetricsSnapshotEvent` object on the corresponding field.
- **`setHeartbeat` test** – Asserts only `latestHeartbeatAt` (the timestamp string) is recorded; `latestSnapshot` and `latestUpdate` remain `undefined`.
- **`setError` test** – Stores a plain string on `lastError`.
- **Overwrite test** – Calls `setSnapshot` twice and asserts only the second value survives.

## Relationships

The dependency graph reports no neighbors. The file imports `useRealtimeObservabilityStore` from `@/modules/realtime/store` (the unit under test) and the `MetricsSnapshotEvent` type from `@types`, but no other graph edges are recorded.

## Notes

- `setHeartbeat` intentionally stores **only** the `timestamp` field, not the full payload — the test enforces that the other two snapshot fields stay `undefined`.
- `makeSnapshot` is shaped as a `MetricsSnapshotEvent` and is passed to all three setter actions; this works because each setter only reads the fields it cares about.
- No network, timer, or mock-based tests are present — this is a pure state-mutation suite.
