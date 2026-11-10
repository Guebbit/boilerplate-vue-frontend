---
source: src/modules/products/tests/e2e/roles.cy.ts
sha256: 9e6ce6f92064c7ed46fcdea6896fff97c35b8f70452cb03a588b8e17b48155a8
signature: 9e6ce6f92064c7ed46fcdea6896fff97c35b8f70452cb03a588b8e17b48155a8
generated_at: 2026-11-10T05:24:08.043407+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/roles.cy.ts

## Purpose

End-to-end role-sweep test that verifies every persona's access to the product pages and their action buttons matches the persona's own permission rules. It is co-located inside the `products` module so that deleting the module automatically removes its sweep. This file is purely the case list; the sweeping logic lives in the shared helper.

## Key elements

- **`sweepRoles('products', [...])`** — single top-level call that registers four page cases under the `products` module:
  - **product list** (`/en/products`) — requires `read:Product`; checks `create` and `row-edit` buttons.
  - **product create** (`/en/products/create`) — requires `create:Product`; checks the `product-on-hand-field` button against `create:StockMovement`.
  - **product page** (dynamic via `cy.subjectId('product.rich')`) — requires `read:Product`; checks the `go-to-edit` button against `update:Product`.
  - **product edit** (dynamic via `cy.subjectId('product.rich')`) — requires `update:Product`; no button assertions.

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — imported as `sweepRoles`; this file delegates all iteration, persona switching, and assertion logic to that helper and only supplies the declarative case array.

## Notes

- Dynamic routes (product page, product edit) resolve the ID at runtime via `cy.subjectId('product.rich')`, meaning the test depends on a seeded fixture named `product.rich`.
- The `product create` page has an intentional extra permission check: the on-hand field requires `create:StockMovement` in addition to the page-level `create:Product`. The inline comment calls it "the stock room's door, stacked on top of `create:Product`."
- `pageRoot` is used as the anchor selector for the sweep (list/create/edit use IDs; the product page uses a bare `h1` tag selector).
- No `buttons` array is declared for the product-edit case, so only page-level visibility is asserted there.
