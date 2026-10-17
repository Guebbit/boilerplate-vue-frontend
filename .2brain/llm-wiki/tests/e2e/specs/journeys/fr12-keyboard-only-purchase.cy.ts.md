---
source: tests/e2e/specs/journeys/fr12-keyboard-only-purchase.cy.ts
sha256: 4d6e90389c737d58b53f52c796991f32a27ade7e40c41964298e182b21c18c97
generated_at: 2026-10-17T02:15:35.433234+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr12-keyboard-only-purchase.cy.ts

## Purpose

End-to-end Cypress journey test proving that a full purchase lifecycle—browse products, add to cart, select shipping, fill the address dialog, choose a payment method, place the order, pay, cancel, and receive a refund—can be completed using only keyboard input (Tab, Shift+Tab, Enter, Space, Arrow keys, Escape). It also verifies the two dialog contracts: focus moves into the dialog on open, stays trapped inside while open, and returns to the triggering control on Escape.

## Key elements

- **`MAX_PRESSES` (60)** — Safety cap on consecutive Tab presses; exceeded presses throw with a focus-trail error.
- **`Target`** — Type alias for `() => Cypress.Chainable<JQuery>`, the lookup function passed to helpers so the element is re-resolved on every press (survives re-renders).
- **`describeFocus(element)`** — Builds a short `tag[name]` string (from `data-test`, `href`, or class) for failure diagnostics; returns `'nothing'` for `null`.
- **`focusVia(label, target)`** — Core navigation helper. Repeatedly presses Tab (or Shift+Tab, decided via `compareDocumentPosition`) until the target element is `activeElement`; collects a focus trail for the error message.
- **`enterOn(selector)`** — Convenience wrapper: `focusVia` to the `data-test` element, then `cy.realPress('Enter')`.
- **`focusIsIn(selector)`** — Asserts `page.activeElement` is contained within the dialog (walks up to Vuetify's `.v-overlay__content` wrapper before the `contains` check).
- **`describe('FR12 · …')` / single `it`** — The test body. Uses `cy.step()` markers to label each phase. Calls `cy.apiAs('secondShopper', …)` to delete seeded addresses before login so the address dialog appears during checkout.

## Relationships

The file declares `requires-module: account, cart, orders, payments, products` in its header comment, indicating it exercises the API surface of those modules (address CRUD, cart POST, order cancel, payment status, product listing). No other files are imported; all helpers are self-contained.

## Notes

- **Cross-window `instanceof`**: The focused element lives in the app's document (a different window from the test runner), so `describeFocus` uses a cast to `HTMLElement` rather than `instanceof`.
- **Vuetify dialog focus quirk**: On open, Vuetify places initial focus on the overlay's `.v-overlay__content` (the dialog card's *parent*), so `focusIsIn` walks up with `.closest('.v-overlay__content')` before checking containment.
- **Narrowest-category strategy**: The test picks the product category with the fewest items so the target product card appears on the first page of search results.
- **Sign-in is exempt**: `cy.loginAs('secondShopper')` is the one non-keyboard step; the form itself is intentionally out of scope.
- **Refund is async**: The payment status flips to "Refunded" only after a `cy.reload()` with a 20 s timeout, because the refund is a server-side reaction to the cancel.
- **Arrow-key list timing**: After typing a country, the test waits for `[role=option]` to be visible before pressing ArrowDown, because a still-animating listbox cannot accept focus.
