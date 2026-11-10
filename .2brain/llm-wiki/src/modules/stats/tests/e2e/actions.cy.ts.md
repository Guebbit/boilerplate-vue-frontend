---
source: src/modules/stats/tests/e2e/actions.cy.ts
sha256: b73b774972a5292eb93127c9278f0a00b85f4e0f183c131fb56fc706081fa3f0
signature: 34e997e3c926fd2019279f3ea15986ee5741993f87ccefb4c016ca089eaf2131
generated_at: 2026-11-10T05:51:02.187290+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/e2e/actions.cy.ts

## Purpose

End-to-end test that drives the stats dashboard and product pages through the shared `actionTable` runner, verifying two user-visible behaviors: a page whose numbers cannot be loaded shows a single alert and recovers on reload, and a period with no data renders its empty-state copy instead of a blank table.

## Key elements

- **`EMPTY_PERIOD`** — Constant defining a single-day window (`2026-01-01`, interval `day`, UTC) used in empty-response bodies.
- **`LIMITS`** — Constant (`maxRangeDays: 731`, `maxBuckets: 400`) included in empty-response bodies to satisfy the schema.
- **`actionTable('stats', [ … ])`** — The single top-level call registering four cases under the `'stats'` group:
  - *Sales load failure* — Intercepts `GET **/stats/sales*`, expects the `stats-load-error` alert, asserts recovery on reload.
  - *Product load failure* — Resolves a product id via `cy.subjectId('product.rich')`, intercepts `GET **/stats/products/*`, same alert/recovery assertion.
  - *Sales empty* — Supplies a body with `currencies: []` validated against `GetSalesStatsResponse`; asserts `[data-test=sales-empty]` is visible and `[data-test=sales-currency]` is not.
  - *Products empty* — Supplies a body with `products: []` validated against `GetProductStatsResponse`; asserts `[data-test=products-empty]` is visible and `[data-test=products-table]` is not.

## Relationships

- **`tests/support/e2e/action-table.ts`** — Provides the `actionTable` runner that interprets each case object (intercept setup, persona, failure/empty assertions, reload logic).
- **`contracts/rest/schemas.zod.ts`** — Supplies `GetSalesStatsResponse` and `GetProductStatsResponse`, the Zod schemas used to validate the mocked empty response bodies before they are served to the app.

## Notes

- All four cases use `persona: 'manager'`; the runner handles the auth/login step.
- The product-page route is a function (not a string) because it depends on a runtime-resolved subject id.
- `emptySchema` is passed alongside `emptyBody` so the runner can validate the fixture against the contract before intercepting—catches schema drift in the test data itself.
- The intercept `url` globs (`**/stats/sales*`, `**/stats/products/*`) are intentionally broad; the `operation` field narrows matching to the correct endpoint.
