---
source: tests/support/e2e/steps.ts
sha256: 8075b773735203eb44dd864d97b56e16a09c9e3024b769f036a6cc6659e9e4d1
signature: 33d725d3bb0bd062e78e7bfe83bb413fc7c0f4aa53b3e97239b3574954db4e28
generated_at: 2026-11-10T07:35:58.578940+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/steps.ts

## Purpose

Shared E2E step functions for Cypress journey specs. Contains plain `cy`-based helpers that multiple stories perform identically—reading money from the screen, driving the storefront cart flow, filling auth/address forms, placing checkouts via API, and polling for eventually-consistent side effects. Deliberately not custom commands, so a spec's call site makes the action explicit.

## Key elements

- **`centsOf` / `shouldShowCents`** — Read a `data-test` selector as cents (one-shot) or retry until a check passes (for debounced totals).
- **`openProductCard` / `searchAndOpenProduct`** — Open a seeded product's card by guarantee name; the latter types the product's own title into the filter box first.
- **`addOpenProductToCart`** — Clicks "add to cart" and waits on a `POST /cart/items` intercept. Uses a module-level counter to generate a unique alias per call (re-registered aliases would yield the first completed request).
- **`shipTheOpenGroup`** — Opens the ship-items dialog, types a tracking code if given, submits, and asserts the dialog closed.
- **`fillAddressDialog`** — Fills the five text inputs by positional index (no `data-test` per input) and handles the `v-autocomplete` country field.
- **`fillSignupForm` / `signUp`** — Fill and submit the signup form; `signUp` visits `/en/signup` first.
- **`submitLoginForm` / `signInWith`** — Fill and submit the login form; `signInWith` is for non-seeded (journey-created) accounts.
- **`refuseALogin`** — Fires a wrong-password `POST /account/login` to seed an audit incident for operator-trail assertions.
- **`addToCartFromStorefront`** — Full shopper flow: navigate to products, filter by category or search, open card, add to cart.
- **`checkoutAs`** — Reads `GET /cart` for the current total, then `POST /cart/checkout` with that `expectedTotal`.
- **`idFromLocation` / `orderNumberShown`** — Extract the order ID from the URL or the display number from the DOM.
- **`eventually`** — Polls a read up to 20 times (500 ms apart) until a predicate is satisfied; yields the last read regardless.
- **`GUEST_CART_KEY` / `GUEST_MERGE_ATTEMPT_KEY`** — `localStorage` keys for the guest cart and its merge attempt.
- **Re-exports** — `cents` and `sumCents` from `scripts/e2e/cents.ts`.

## Relationships

- **Imports** `cents` / `sumCents` from `scripts/e2e/cents.ts`, `mailAbout` from `scripts/e2e/mail-filters.ts`, and the `MailedEmail` type from `scripts/e2e/mail-message.ts`.
- **Imports** `requestAsDevice`, `Device`, `DeviceResponse` from `./harness` (local).
- **Consumed by** the journey specs (`ac11`, `ac12`, `ac13`, `ac14`, `ac15`, `ac16`, `ac18`, `ac20`), `commerce.cy.ts`, and the a11y spec in `src/modules/observability/tests/e2e/a11y.cy.ts`.

## Notes

- Functions are intentionally **not** registered as `Cypress.Commands`; the file's own doc comment explains this is so a spec reads `addToCart('product.rich')` rather than an opaque command name.
- `addToCartFromStorefront` requires the caller to already be on a page with the app bar (it does not visit first).
- The address dialog's five text inputs carry **no** `data-test` attributes because the dialog is shared with the profile page; they are addressed by `input` tag and positional index.
- The storefront search box filters **only on submit** (Enter); typing alone does not narrow the list.
- `eventually` yields the last read even on timeout so the caller's own assertion reports the final observed state.
