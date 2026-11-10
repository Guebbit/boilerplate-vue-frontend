---
source: tests/e2e/specs/journeys/at5-stock-ledger-filters.cy.ts
sha256: 7e72121b45939beedc3d4062ebf5e9ea0beb595753e2f1f611a8d85dee41a52a
signature: 0ee65f663871ffb7ede1a969046dcf096e53a2bf84d0429f39457a3f20e2bea0
generated_at: 2026-11-10T06:51:54.989319+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-stock-ledger-filters.cy.ts

## Purpose

E2E journey test (AT5) that verifies the stock-ledger UI filters work correctly: the reason dropdown narrows movements to one type, the product combobox narrows to one product, and the board's "low stock only" toggle shrinks the board. Each filter is then reset to confirm the full list returns.

## Key elements

- **`movement(productId, verb, body)`** — Local helper that POSTs a stock movement (`receive` or `adjust`) for a given product via `cy.apiAs('admin', …)`.
- **`onlyReasons(reason)`** — Local helper that asserts every visible `[data-test=movement-reason]` chip contains the given reason string; guards against a stale read from a concurrent refetch.
- **`describe('AT5 · Stock ledger filters')`** — Single test case that:
  1. Seeds one receipt and one adjustment for `product.inStock` via the API.
  2. Cycles the reason filter (Received → Adjusted → All) and asserts row counts / chip text.
  3. Types the product title into the product combobox and asserts every visible row references that product (by title *or* id).
  4. Creates a low-on-hand product, toggles `levels-low-only`, and asserts the total changes while the new product appears; toggles off and asserts the total returns.

## Relationships

No graph-neighbor files are recorded for this spec.

## Notes

- **Module prerequisites** (declared in the header comment): `account`, `inventory`, `products` must be seeded/available before this spec runs.
- **`cy.restore()`** in `beforeEach` resets application state; the test depends on this to start from a known ledger.
- **`cy.pickOption`, `cy.apiAs`, `cy.subjectId`, `cy.subjectProduct`, `cy.createProduct`, `cy.step`** are project-specific custom commands (likely defined in the Cypress support/commands layer).
- **Stale-read guard:** the list refetches on every filter pick, so `onlyReasons` uses `.should()` to retry rather than taking a one-shot snapshot.
- **Product column ambiguity:** a ledger row may display the product by its title *or* by its `productId` (when the catalogue page that loaded the ledger doesn't carry the title). The assertion accepts either.
- **Low-stock total timing:** `[data-test=levels-total]` renders `"0"` until the board data arrives; the test waits for a `[data-test=level-row]` to exist before capturing the "before" total.
- The product combobox must be **cleared first** because its default visible text is `"All products"`, which would interfere with typing a new query.
