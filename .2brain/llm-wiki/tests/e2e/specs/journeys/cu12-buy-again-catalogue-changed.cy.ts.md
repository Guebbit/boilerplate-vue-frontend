---
source: tests/e2e/specs/journeys/cu12-buy-again-catalogue-changed.cy.ts
sha256: ac6211dc3017c551f8a6e8dd7dff706bb72464e3b4b8bb4926764b9779aac506
generated_at: 2026-10-17T02:09:37.724245+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu12-buy-again-catalogue-changed.cy.ts

## Purpose

End-to-end test for use-case CU12: a customer re-orders an old order whose three products have each met a different fate (untouched, image-replaced, deleted). Verifies that the order page renders live catalogue images (never frozen, never broken) and that the buy-again flow names the dropped line while the cart accepts only what is still purchasable. No payment occurs.

## Key elements

- **`OrderLine`** — interface mirroring the API shape of one order item: `product` (id, title) and `current` (the live product or `null` if deleted).
- **`Fate`** — union type `'untouched' | 'replaced' | 'deleted'` describing what happened to a line's product post-purchase.
- **`fateOf(line)`** — classifies a line: `null` current → deleted; `imageUrl` matching `UPLOAD_PATH` → replaced; otherwise → untouched.
- **`describe` block / single `it`** — one test that logs in as `user`, fetches the seeded order (`order.mixedImageStates`), asserts image rendering per fate, clicks reorder, checks the "no longer sold" notice names the deleted product, and verifies the cart contains exactly the two surviving items.

## Relationships

- **`tests/support/e2e/images.ts`** — imports `UPLOAD_PATH`, a regex used by `fateOf` to distinguish a user-uploaded (content-hashed) image URL from a seeded one under `/images/seed/`.

## Notes

- The test relies on a seeded fixture (`cy.subjectId('order.mixedImageStates')`) that pre-creates an order with exactly one line of each fate; the assertion `['deleted', 'replaced', 'untouched']` will fail if the seed changes.
- `requires-module: cart, orders, products` — the test assumes those backend modules are active; running without them will 404 on the API calls.
- The "decoded" check (`naturalWidth > 0`) catches a 404 image that still has a valid `src` attribute; a simple `.should('have.attr', 'src')` assertion is not sufficient.
- `cy.step` calls are descriptive markers for reporting, not functional gates.
- The test never submits a payment, so card/budget fixtures are unaffected.
