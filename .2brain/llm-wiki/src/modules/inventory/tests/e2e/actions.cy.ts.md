---
source: src/modules/inventory/tests/e2e/actions.cy.ts
sha256: 6c53d8f3d421f0b5c19a925a3e770f3cc20318997d91efd607a792c4476c7349
signature: 39bc88f61fb56d9e2122b894c9483ba01e4d5320db05084e1542f404baf98050
generated_at: 2026-11-10T04:32:59.000488+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/e2e/actions.cy.ts

## Purpose

E2E test suite for the inventory module's user-facing actions, driven through the shared `actionTable` runner. It verifies three empty-state renderings (stock-movement ledger, preorder level board, preorder order board) and two error-then-retry form flows (stock receipt, stock adjustment).

## Key elements

- **`emptyPage`** (const) — canonical paged response with zero items; reused as the intercepted body for all three empty-state cases.
- **`pickInStockProduct(field: string)`** (private helper) — types a product title into an autocomplete input identified by a `data-test` attribute and selects the matching option from the listbox.
- **`actionTable('inventory', […])`** call — registers five cases:
  - 3 × `kind: 'empty'` — intercept the paged GET, validate the body against a Zod schema, then assert the empty-state copy is visible and no rows/pager exist.
  - 2 × `kind: 'form'` — `prepare` fills the receipt/adjust form, `trigger` submits, the runner injects a failure on the intercepted POST, asserts the alert message and that typed values survive, then retries and expects success.

## Relationships

- **`tests/support/e2e/action-table.ts`** — provides the `actionTable` runner. Each case object in the array is consumed by that runner to set up interception, drive the UI, and perform assertions. This file is the sole consumer here.
- **`contracts/rest/schemas.zod.ts`** — exports `ListStockMovementsResponse`, `ListPreorderLevelsResponse`, and `ListPreorderFulfillmentOrdersResponse`, imported here to schema-validate the intercepted empty responses in the three `kind: 'empty'` cases.

## Notes

- The file is a side-effect module (`@module`); it exports nothing. All behavior is executed at import time via the `actionTable` call.
- `valuesNotCompared` on both form cases documents a known autocomplete quirk: the search input is rewritten after selection, so a strict value-equality check on that field would be a false negative.
- All cases run as the `admin` persona; no other personas are exercised in this file.
- `pickInStockProduct` relies on the custom `cy.subjectProduct` command (defined elsewhere in the test support layer) to fetch a known in-stock product.
