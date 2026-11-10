---
source: src/modules/observability/tests/store.spec.ts
sha256: 303d4ef9361504b99b86841212a957cd5febd03fc81248ead268fe5621d74b34
signature: a8e1ba8ca412e3c414f3934569db0de921040fde2528d2703c408855336e5828
generated_at: 2026-11-10T04:55:38.314742+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/store.spec.ts

## Purpose

Vitest unit tests for the `useObservabilityRealtimeStore` Pinia store. Each test runs against a freshly created Pinia instance (via `setActivePinia(createPinia())` in `beforeEach`) to verify that the store's state fields and action methods behave in isolation without cross-test contamination.

## Key elements

- **`makeSnapshot(timestamp)`** — Local helper that builds a minimal valid `MetricsSnapshotEvent` object (fixed `uptimeSeconds`, memory, http, and realtime fields) so tests don't hard-code large literals.
- **`describe('useObservabilityRealtimeStore')`** — The single suite. Each `it` block exercises one concern:
  - Initial state: `status === 'idle'`, all data fields confirmed via `toBeUndefined()`.
  - `setStatus` — sets `status` to the given value (`'connecting'`, `'open'`).
  - `setSnapshot` — stores the full event in `latestSnapshot`.
  - `setUpdate` — stores the full event in `latestUpdate`.
  - `setHeartbeat` — extracts **only** `timestamp` into `latestHeartbeatAt`; leaves `latestSnapshot` / `latestUpdate` untouched.
  - `setError` — writes the message string to `lastError`.
  - Overwrite semantics — calling `setSnapshot` a second time replaces the prior value.

## Relationships

- **`src/modules/observability/store.ts`** — The system under test. This file imports `useObservabilityRealtimeStore` from that module and asserts on its exposed state and actions.
- **`@types` (workspace package)** — Provides the `MetricsSnapshotEvent` type used to type the `makeSnapshot` helper and the expected payloads.

## Notes

- The heartbeat test is the only one that asserts a *partial* extraction (timestamp only). If the store changes to store the full heartbeat payload, this test will fail.
- Tests are intentionally minimal — they cover one action per case and do not test reactive dependencies, computed properties, or cross-store interactions.
- The `makeSnapshot` helper is not exported; it exists solely within this file.
