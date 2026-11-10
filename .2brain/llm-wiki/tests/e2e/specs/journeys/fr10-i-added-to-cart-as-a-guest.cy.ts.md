---
source: tests/e2e/specs/journeys/fr10-i-added-to-cart-as-a-guest.cy.ts
sha256: 8ff1dec974e4e18abe44a404772cfe67c6fcb2c8f923ab7a893dddab2dd80b5f
signature: 8ff1dec974e4e18abe44a404772cfe67c6fcb2c8f923ab7a893dddab2dd80b5f
generated_at: 2026-11-10T07:03:38.475260+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr10-i-added-to-cart-as-a-guest.cy.ts

## Purpose

End-to-end journey test for FR10: a guest adds a product to a browser-based cart, is told checkout requires an account, and—after logging in or signing up via the app bar—is returned to the same product page (not Home) where one click completes the add-to-cart. Verifies the `continue=` redirect round-trip for both auth paths.

## Key elements

- **`NEWCOMER` / `NEWCOMER_PASSWORD`** – constants for a throwaway signup identity (`fr10.newcomer@example.com`).
- **`beforeEach`** – visits `/en`, calls `cy.restore()`, and `DELETE`s all cart items via `cy.apiAs('user', …)` so any line seen later was added by this story.
- **Single `it` block** – walks five `cy.step` milestones in sequence:
  1. Guest sees enabled "Add to cart" + "Sign in to check out" notice.
  2. Clicking the nav login link produces a `continue=<productPath>` query string.
  3. Logging in with the seeded `user` account returns to the product; `addOpenProductToCart()` adds the line.
  4. After logout, revisiting the product and clicking the sign-up link also carries the `continue=` param.
  5. Submitting `fillSignupForm(NEWCOMER, …)` lands on the product, not Home.

## Relationships

- **`tests/support/e2e/steps.ts`** – imports `addOpenProductToCart` (clicks the add-to-cart button on the currently open product page) and `fillSignupForm` (populates and submits the signup form with the given credentials).

## Notes

- The `requires-module: account, cart, products` comment at the top signals which backend feature modules this journey depends on; the test harness likely gates execution on those.
- The login step reuses the pre-seeded `user` account (via `cy.accountOf('user')`), while the sign-up step creates a brand-new account—two distinct auth paths are covered in one journey.
- After `cy.logout()` the app lands on Home, so the test explicitly re-visits the product page before exercising the sign-up redirect; without that visit the `continue=` param would not be present.
- The `continue` value is URL-encoded in the query string; assertions decode it before comparing to `productPath`.
