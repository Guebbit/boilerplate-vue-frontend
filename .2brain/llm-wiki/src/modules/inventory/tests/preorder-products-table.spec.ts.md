---
source: src/modules/inventory/tests/preorder-products-table.spec.ts
sha256: c959e9775f554b9b23c8fbca601e1fa0a9f3ad1a5aabf0dbebb426af35cd0078
generated_at: 2026-10-17T01:00:50.410723+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/preorder-products-table.spec.ts

## Purpose

Vitest unit tests for `PreorderProductsTable.vue` (the board's first tab). Verifies the on-screen join of two transport-level reads — the allowance list and the fulfillment-order summary — including display of allowance numbers, non-zero state counts, the "show orders" hand-off emit, and the conditional release-date link gated on the product write ability.

## Key elements

- **`answers`** — module-level variable holding the stubbed HTTP responses keyed by URL; reassigned by `mountTable` per case.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a resolver that reads from `answers` via `parseOrvalFixture`, making the HTTP transport the seam (no store-level stubs).
- **`router`** — a real `vue-router` instance built from `collectModuleRoutes(enabledModules)`; used so the product edit link (`/en/products/p1/edit`) resolves to a concrete path.
- **`mountTable(levels, summaries, abilities)`** — helper that seeds the session store (token, viewer, abilities), populates `answers` via `orvalEnvelope`, mounts the component with `router` + `vuetify` + `i18n` plugins, and awaits `flushPromises`.
- **`beforeEach`** — resets Pinia, pushes the route `/en/sales/preorders`, loads the `en` locale.
- **Six `it` cases** — cover: allowance row display (limit/outstanding/split/remaining), non-zero state chips with `data-count` attributes, a product with no allowance row, the empty-state message, the `showOrders` emit, and the release-date link visibility gated on the `update:Product` ability.

## Relationships

- **`PreorderProductsTable.vue`** — the component under test; imported directly and mounted by `mountTable`.
- **`tests/support/unit/fixtures.ts`** — supplies the `aPreorderLevel` and `aPreorderSummary` factory functions used to build test data.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register the inventory and delivery modules with the kernel before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps items + pagination meta) and `parseOrvalFixture` (deserialises the stub into the shape the component expects).

## Notes

- The mock is at the **HTTP transport** level (`orvalMutator`), not at the Pinia store level; the tests never assert on store state.
- `wireModulesIntoCore()` runs **once at import time**, not in `beforeEach` — it mutates global registry state, so order relative to other test files in the same worker matters.
- The router is **not** a stub; it carries the full enabled-module route tree specifically so the release-date `href` assertion can verify the resolved path.
- The "hands to second tab" test asserts an **emitted event** (`showOrders`), not a navigation — tab switching is the parent's concern.
- State chips are located via `data-count` attributes; only states with a non-zero unit count are rendered (verified by the `shipped: 0` exclusion in the state-counts case).
