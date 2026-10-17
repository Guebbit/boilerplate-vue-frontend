---
source: tests/e2e/specs/journeys/fr10-i-added-to-cart-as-a-guest.cy.ts
sha256: bf0113c2b8fdc86270b28da0eb102c36f9d9bf6eb0eb2aec71fdb945cce5f03e
generated_at: 2026-10-17T02:15:11.878034+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr10-i-added-to-cart-as-a-guest.cy.ts

## Purpose

E2E journey test for FR10: a guest can add a product to a browser-local cart but must authenticate to check out. Verifies that "Log in" and "Sign up" in the app bar carry a `continue=` return address so the user lands back on the same product page (not home) after authentication, and that one click then adds the item to the cart.

## Key elements

- **`NEWCOMER` / `NEWCOMER_PASSWORD`** – Fixed credentials used only for the sign-up portion of the journey.
- **`beforeEach`** – Visits `/en`, calls `cy.restore()` (fixture reset), and deletes all cart lines via `cy.apiAs('user', 'DELETE', '/cart/all')` so the test's single cart line is unambiguous.
- **`describe('FR10 · …')` / `it('a guest may add to a cart…')`** – Single test case covering: guest add-to-cart UI, "Sign in to check out" prompt, login redirect with `continue=` param, post-login product-page redirect, adding to cart, logout, sign-up redirect with `continue=` param, and post-signup product-page landing.
- **`addOpenProductToCart`** (imported) – Clicks the add-to-cart button on the currently open product page.
- **`fillSignupForm`** (imported) – Populates and submits the registration form with the given email/password.

## Relationships

- **`tests/support/e2e/steps.ts`** – Provides the two step helpers imported here: `addOpenProductToCart` (clicks `[data-test=add-to-cart]`) and `fillSignupForm` (fills email, password, confirm, and submits the signup form). All other interactions use custom Cypress commands (`cy.subjectProduct`, `cy.accountOf`, `cy.step`, `cy.goToCart`, `cy.logout`, `cy.restore`, `cy.apiAs`) defined elsewhere in the support layer.

## Notes

- The file header declares `requires-module: account, cart, products`, meaning the test runner must seed those fixtures before this spec executes.
- The "remember the product" behavior is implemented via a `continue=<encoded-path>` query parameter on the login/signup URLs; the test asserts this parameter is present rather than testing the redirect mechanism internally.
- After logout the app lands on Home, so the test must re-navigate to the product page before testing the sign-up flow.
- The login step reuses the pre-existing `'user'` fixture account (`cy.accountOf('user')`), while the sign-up step creates a new one with `NEWCOMER`.
