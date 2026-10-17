---
source: tests/support/e2e/steps.ts
sha256: afc299a41a46a2c4ee87830de8be8841668a3a014e4c1852a7a6693d9b26988d
generated_at: 2026-10-17T02:27:08.567045+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/steps.ts

## Purpose

Shared Cypress step functions used by multiple E2E journey and commerce specs. It extracts UI-driving logic (adding to cart, filling forms, shipping, checking out, reading money) that two or more stories perform identically, so each spec reads `addToCart('product.rich')` rather than re-implementing the same clicks. Story-unique steps intentionally stay in their own spec file.

## Key elements

- **`centsOf(selector)`** — reads one money element's text and converts to cents (single read).
- **`shouldShowCents(selector, check)`** — retrying assertion; polls until `check` stops throwing (use for debounced totals).
- **`openProductCard(name)`** / **`searchAndOpenProduct(name)`** — open a seeded product's card from the storefront list, resolving the title via the API rather than hard-coding it.
- **`addOpenProductToCart()`** — clicks "add to cart" and waits on a uniquely-aliased `POST /cart` intercept (counter-aliased to avoid stale-route reuse).
- **`addToCartFromStorefront(name)`** — full storefront → category/search → card → add-to-cart flow.
- **`shipTheOpenGroup(trackingCode?)`** — opens the ship dialog, types tracking code if needed, submits.
- **`fillAddressDialog(address)`** — fills the 5 indexed text inputs plus the country `v-autocomplete` in the address/profile dialog.
- **`fillSignupForm(email, password)`** / **`signUp(email, password)`** — fills and submits the signup form; `signUp` also visits the page and asserts landing on Home.
- **`submitLoginForm(email, password)`** / **`signInWith(email, password)`** — fills and submits the login form; `signInWith` visits `/en/login` first. For non-seeded credentials (use `cy.loginAs` for seeded ones).
- **`refuseALogin()`** — fires a deliberately-wrong `POST /account/login` to create one audit-trail incident.
- **`checkoutAs(role, body?)`** — reads `GET /cart` for the correct total, then `POST /cart/checkout` with that `expectedTotal`.
- **`idFromLocation()`** — last path-segment of the current URL.
- **`orderNumberShown()`** — the human-readable order number from `[data-test=order-number]`.
- **`eventually(read, isDone, attemptsLeft?)`** — polls a chainable read up to 20 times (500 ms apart); yields the last value so the caller's assertion reports the final state.
- **`GUEST_CART_KEY`** / **`GUEST_MERGE_ATTEMPT_KEY`** — `localStorage` keys for the guest cart and its unanswered merge.
- Re-exports **`cents`**, **`sumCents`** from `scripts/e2e/cents.ts`.

## Relationships

- **`scripts/e2e/cents.ts`** — imports `cents` and `sumCents`; re-exports them so specs can `import { cents } from '…/steps'`.
- **`scripts/e2e/mail-message.ts`** — imports the `MailedEmail` type (used in the truncated portion for mail-reading helpers).
- **`./scenario`** — imports the `E2ERole` type used by `checkoutAs`.
- **Journey specs** (`ac3`, `ac5`, `ac7`, `ac11`, `ac12`, `ac14`, `ac15`, `ac16`, `ac18`, `ac20`, `at4`) and **`commerce.cy.ts`**, **`a11y.cy.ts`** — the primary consumers; each spec calls the step functions to drive shared UI flows instead of inlining them.

## Notes

- **Plain functions, not `cy` commands.** Deliberate: a call like `addToCart('product.rich')` makes it obvious the storefront is being driven, whereas a custom command would hide that.
- **`addOpenProductToCart` alias counter.** Cypress keeps routes for a re-registered alias; using `@addToCart1`, `@addToCart2`, … ensures `cy.wait` resolves the *current* request, not a prior one's.
- **Address dialog inputs have no `data-test` attributes** (the dialog is shared with profile specs). Steps target them by `input` index within the dialog.
- **`checkoutAs` must read the cart first** because `POST /cart/checkout` validates `expectedTotal` against the server-side total; a stale or omitted total is rejected.
- **`eventually` is for async side-effects** (e.g., a refund landing after a cancel via an event queue), not for initial page-load waits — use `cy.get`/`should` for those.
