---
source: src/modules/orders/tests/use-order-actions-refetch.spec.ts
sha256: fc09e3c6a22426c439032001a9c29a881d0f4d96e3135d0fbce60f703d583d94
generated_at: 2026-10-17T01:19:51.160687+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/use-order-actions-refetch.spec.ts

## Purpose

Vitest spec for the `useOrderActionsRefetch` composable. It verifies each of the four guard conditions (once-only latch, stale-id check, `actions === undefined` test, `immediate` run) independently, because any single one in isolation would appear correct from the outside. The file exists to lock in the contract that exactly one forced detail re-fetch fires per mount and no more.

## Key elements

- **`watchOrder(initial, targetId?)`** — Test harness that creates a reactive `Order | undefined` ref, a `vi.fn` fetch spy, and mounts the composable. Returns `{ currentOrder, fetchOrder }` for assertion.
- **`order(id, actions?)`** — Minimal factory for an `Order` record; `actions` omitted means "summary row still in cache."
- **`NO_MOVES`** — `OrderActions` with every field empty/false, representing a terminal order (detail arrived, nothing to do).
- **`CAN_CANCEL`** — `OrderActions` with `transitions: ['cancelled']` and `cancel: true`, representing a live order.
- **`describe('useOrderActionsRefetch')`** — Nine `it` blocks, each isolating one guard:
  - immediate fetch for a cached summary row
  - fetch fires once the record resolves (was `undefined`)
  - `forced: true` is passed (bypasses cache-first `watchOne`)
  - no fetch when `actions` is already present (any `OrderActions`)
  - an *empty* `OrderActions` (`NO_MOVES`) is treated as present, not missing
  - record with a different `id` is ignored
  - at most one fetch per mount regardless of how many times the record mutates
  - latch holds even after the fetch answer itself carries `actions`
  - no fetch while the record stays `undefined`

## Relationships

- **`src/modules/orders/composables/use-order-actions-refetch.ts`** — System under test. The spec imports `useOrderActionsRefetch` and exercises it through the `watchOrder` harness. All assertions are about the call count, arguments, and timing of the `fetchOrder` callback the composable invokes.
- **`@types`** (`Order`, `OrderActions`) — Type-only imports used to shape the fixture objects.

## Notes

- `watchOrder` accepts `targetId` as a *getter* (`() => targetId`) rather than a plain string. This mirrors how the composable actually reads the id on every watcher run and keeps the door open for testing a navigation that retargets the latch.
- The "empty `OrderActions` ≠ missing `OrderActions`" test (`NO_MOVES`) guards against a subtle regression: a truthiness check on `actions.transitions.length` or similar would re-fetch forever on a delivered terminal order. The spec pins the `undefined`-vs-present distinction explicitly.
- The once-only latch test deliberately re-triggers the watcher three times (set → clear → set) to prove the latch, not the data, is what stops the second fetch.
