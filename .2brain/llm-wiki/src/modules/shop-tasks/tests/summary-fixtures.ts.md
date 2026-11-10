---
source: src/modules/shop-tasks/tests/summary-fixtures.ts
sha256: 46031eba879c002f228e19d585df1d4d1616296186f8cfa8f1dba17403c91d7e
signature: 26d53015cb74da824e5e30347d36b7f6c940e8f54bcb692e7af992413f1f9b0f
generated_at: 2026-11-10T05:44:00.361629+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/tests/summary-fixtures.ts

## Purpose

Test fixture factory that builds a valid `ShopWorkSummary` object for shop-task unit tests. It runs the assembled object through the Zod schema (`GetShopWorkSummaryResponse`) at construction time, so any fixture that drifts from the API contract fails immediately in the test rather than surfacing later in a screen or integration test.

## Key elements

- **`aSummary(overrides?: ShopWorkSummary)`** — Returns a `ShopWorkSummary` that passes Zod validation. Accepts a partial-object spread to override any count (or the whole object). Defaults: `salesOrders: 4, salesPayments: 3, returns: 2, salesPreorders: 1, inventory: 5`.

## Relationships

- **`contracts/rest/schemas.zod.ts`** — Source of the `GetShopWorkSummaryResponse` Zod schema (imported as `@api/schemas`). This file calls `.parse()` against that schema; if the schema shape changes, this fixture breaks first.
- **`src/modules/shop-tasks/tests/work-feed.spec.ts`** — Same-directory test spec that consumes `aSummary` to feed mock summaries into work-feed assertions.
- **`tests/unit/kernel/nav-badges.spec.ts`** — Cross-module test spec that also relies on the same fixture shape to validate badge counts against a summary payload.

## Notes

- The fixture uses `Zod .parse()`, not a TypeScript type assertion. This means a silent shape mismatch (e.g., a renamed field) throws at call time inside the test, producing a schema error rather than a `TypeError` deep in component code.
- `overrides` is spread *after* the defaults, so passing a partial object (e.g., `{ returns: 0 }`) zero-out a single count while keeping the rest valid.
- Because the defaults are non-zero integers, tests that assert "empty state" must explicitly override every relevant count rather than relying on the fixture to start at zero.
