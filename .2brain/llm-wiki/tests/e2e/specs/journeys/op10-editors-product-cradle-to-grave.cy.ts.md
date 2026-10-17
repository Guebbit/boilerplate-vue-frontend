---
source: tests/e2e/specs/journeys/op10-editors-product-cradle-to-grave.cy.ts
sha256: 4e4ba3785512b9fa2b2dc8685dd4560818b3691f8719890f1ffd7eb8ba89b0c0
generated_at: 2026-10-17T02:18:42.854641+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op10-editors-product-cradle-to-grave.cy.ts

## Purpose

End-to-end journey test (OP10) that exercises the full product lifecycle from an editor's perspective: creating a bilingual product with price, weight, tax class, category, tag, and image; then deactivating, soft-deleting, restoring, and hard-deleting it. Each state transition is verified both from the editor's admin UI and from a guest's HTTP read, confirming that guest-facing visibility tracks the product's status. It also confirms that a pre-seeded order referencing a hard-deleted product remains readable.

## Key elements

- **`unique()`** — returns a `Date.now()`-based string so concurrent spec runs on the same backend don't collide on titles or tags.
- **`ProductLike`** — minimal interface (`id: string`) used to type the `cy.apiAs` response for the restore assertion.
- **`guestStatusOf(id)`** — calls the `guestApi` Cypress task against `/products/:id` and returns the HTTP status code as a `Cypress.Chainable<number>`, allowing the test to assert 404 without a `cy.request` that would fail on non-2xx.
- **`describe("OP10 · An editor's product, cradle to grave")`** — single test with `beforeEach` that visits `/en`, calls `cy.restore()`, and revisits. The test uses `cy.step(...)` markers to segment the lifecycle phases (create → verify round-trip → guest reads → deactivate → soft-delete → restore → hard-delete → order still readable).

## Relationships

No graph neighbors are registered for this file.

## Notes

- The `// requires-module: account, locales, orders, products` comment declares which backend modules must be enabled before this spec can pass.
- A comment in the deactivate step warns that submitting the edit form *before* the fetched record has populated fields will send an empty price; the test guards against this by asserting `product-weight-field` already holds `"750"` before unchecking the active toggle.
- Guest reads are cached for one hour in production; every product write invalidates that cache. The repeated `guestStatusOf` calls after each state change are intentional proof of that invalidation.
- The image upload reuses `tests/e2e/fixtures/sample-image.png` with `force: true` (the input is not natively visible).
- `cy.restore()` in `beforeEach` seeds/resets fixture data; without it the seeded `order.productDeleted` subject may be missing.
- The test relies on the `guestApi` and `cy.apiAs` Cypress tasks being defined in the support layer, as well as `cy.subjectId` for retrieving seeded entity IDs.
