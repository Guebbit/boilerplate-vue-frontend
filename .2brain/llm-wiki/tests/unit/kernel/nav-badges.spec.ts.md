---
source: tests/unit/kernel/nav-badges.spec.ts
sha256: b07c3e0fc1fe18625876ba51a438b2ecbb4e7bf7bb9d5fa72940842920b64528
signature: 9179b53f63f0179ccc46b4dd69e1d47c57dc01b6318c4b3c4ef98b222a937c4c
generated_at: 2026-11-10T08:09:44.547285+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/nav-badges.spec.ts

## Purpose

Verifies that each staff navigation entry's badge reads **only its own** key from the shop-summary work-count store, covering the five screens backed by `GET /shop-tasks/summary`. Also confirms the badge reflects the latest count when the summary is updated.

## Key elements

- **`WEARS`** — A `const` map binding nav-entry names to the summary key each one must wear (`SalesOrders → salesOrders`, `PaymentsList → salesPayments`, `SalesReturns → returns`, `PreordersBoard → salesPreorders`, `InventoryLedger → inventory`).
- **Parameterized test (`it.each`)** — For every `(name, key)` pair in `WEARS`, seeds the count store via `setWorkCounts(aSummary())`, resolves the entry from `collectModuleNavigation(enabledModules)`, and asserts `entry.badge().value` equals `counts[key]`.
- **Reactivity test** — Resolves the `SalesOrders` entry and its badge *before* re-seeding the store, then asserts the badge now reports the new value (`9`), proving the badge reads live from the store rather than caching.
- **`afterEach(clearWorkCounts)`** — Resets the work-count store between tests to prevent cross-contamination.

## Relationships

- **`src/modules/shop-tasks/tests/summary-fixtures.ts`** — Supplies the `aSummary()` helper (optionally with overrides like `{ salesOrders: 9 }`) that shapes the object handed to `setWorkCounts`. The test file is the sole consumer of this fixture.

## Notes

- The `WEARS` map is the single source of truth for the name→key contract; adding a new screen requires an entry here *and* a matching badge implementation in the module's nav registration.
- The second test intentionally captures the badge reference **before** updating the store, so it specifically guards against snapshot-style badges that copy the value once.
