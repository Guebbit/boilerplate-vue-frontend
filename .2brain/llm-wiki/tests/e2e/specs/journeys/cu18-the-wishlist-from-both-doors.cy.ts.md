---
source: tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts
sha256: 80e3f489d0e187c1e294b362d83a4747603a4e08999f56a6fba928f1bdc05be8
signature: beb0fb2f00b07126fba512ad1ab19dbb2b51a8cd2d769c0e371c1531d6c83dd1
generated_at: 2026-11-10T06:55:56.816376+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu18-the-wishlist-from-both-doors.cy.ts

## Purpose

E2E journey (CU18) verifying that wishlist state is consistent across three surfaces—product grid card, product detail page, and the dedicated wishlist page—and that "move to cart" increments quantity rather than overwriting. Every UI assertion is paired with an API readback for the same account. No payment occurs.

## Key elements

- **`searchProducts(title)`** – Types a title into the `[data-test=filter-text]` input and asserts a matching `[data-test=product-card]` exists.
- **`SAVED` / `NOT_SAVED`** – Expected text labels for the wishlist heart toggle in its two states.
- **`WishlistBody`** – Local interface describing the minimal API shape (`items: { productId }[]`) used for the empty-state assertion.
- **`describe` / `it` block** – Single test: save from card → verify detail page → verify list count (3) → remove all → confirm empty state + API → re-save two products → move one to an already-populated cart → assert quantity is 2 via `GET /cart`.

## Relationships

- **`tests/support/e2e/steps.ts`** – Provides `searchAndOpenProduct` and `addOpenProductToCart`, used in the "put the food in the cart" and re-save steps.
- The `requires-module` header comment (`cart, inventory, products, wishlist`) signals which backend modules must be running; it is a convention, not a code import. The listed unit-test spec files (`guest-cart-view.spec.ts`, `movement-ledger.spec.ts`, `product-lines.spec.ts`, `products-list-view.spec.ts`) test the same modules at the unit level but are not referenced by this file.

## Notes

- **`cy.restore()` in `beforeEach`** – Resets persisted state (likely via a custom command) before each run so the journey starts from a known wishlist size (2 pre-saved items).
- **Nested `.then()` for subjects** – `cy.subjectProduct` calls are chained to avoid parallel async resolution; the order of `bottle` → `food` is load-bearing for the subsequent steps.
- **`cy.apiAs` custom command** – Performs authenticated API calls tied to the logged-in user; used for the final two assertions (empty wishlist, cart quantity).
- **No payment steps** – The journey intentionally stops at cart contents; it never reaches checkout.
