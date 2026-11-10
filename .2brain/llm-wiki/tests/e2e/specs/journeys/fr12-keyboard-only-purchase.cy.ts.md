---
source: tests/e2e/specs/journeys/fr12-keyboard-only-purchase.cy.ts
sha256: 7e4a1810ecdac18ab09687a5e88bebb91f13d8369859007ba0b710afc1ecfee0
signature: 197f85dc2097a4ae60998f9d5692154d61eadee574ee48720189792716839866
generated_at: 2026-11-10T07:04:17.721849+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr12-keyboard-only-purchase.cy.ts

## Purpose

End-to-end Cypress test proving that a full purchase lifecycle—browse, add to cart, choose shipping, fill the address dialog, pay, cancel, and confirm refund—can be completed without a single mouse interaction. It validates keyboard-only reachability (Tab / Shift+Tab / Enter / Space / Arrow / Escape) and the two dialog focus contracts: a dialog traps focus while open and returns it to the trigger on Escape.

## Key elements

- **`MAX_PRESSES`** (60) – upper bound on Tab presses before `focusVia` throws, preventing infinite loops.
- **`Target`** (type) – `() => Cypress.Chainable<JQuery>`; a re-queryable selector so the element is re-located after every re-render.
- **`describeFocus(element)`** – returns a short human-readable label (`tag[data-test|href|class]`) for failure trails.
- **`focusVia(label, target)`** – the core keyboard walker: repeatedly presses Tab or Shift+Tab (decided via `compareDocumentPosition`) until `document.activeElement` is the target; collects a focus trail for diagnostics.
- **`enterOn(selector)`** – convenience wrapper: `focusVia` + `realPress('Enter')`.
- **`focusIsIn(selector)`** – asserts the active element is a descendant of the dialog's `.v-overlay__content` wrapper (Vuetify focuses the overlay box, not the card directly).
- **`describe('FR12 …')` block** – single test that:
  1. Empties `secondShopper`'s address book via API (so the address dialog is not suppressed).
  2. Signs in, Tabs to Products, picks the narrowest category chip, opens the product card, adds to cart.
  3. Selects a shipping method that requires an address (Space), opens/fills/closes the address dialog (keys + Arrow into the country list).
  4. Selects a card payment, places the order, picks a "Card that pays" option via ArrowDown, submits, asserts "Succeeded".
  5. Opens the cancel dialog, verifies focus stays inside (4 Tab presses), closes on Escape, re-opens, confirms, asserts "Refunded" after reload.

## Relationships

- **`src/modules/locales/tests/languages-list-actions.spec.ts`** – Both specs exercise the same locale-prefixed route structure (`/en/…`). This journey test navigates exclusively through `/en`-prefixed paths and asserts on them; the languages-list-actions spec validates the switcher UI that changes that prefix. A regression in locale route registration or the active-locale context would surface failures in both files simultaneously.

## Notes

- The test intentionally signs in "the ordinary way" (form click/type) to isolate the keyboard-only assertion to everything *after* authentication.
- `focusVia` uses a **cast** (`element as HTMLElement`) rather than `instanceof HTMLElement` because the active element lives in an iframe's document; `instanceof` would throw across realms.
- The address dialog is only reachable when the shopper's address book is **empty**; the test deletes all seeded addresses via `cy.apiAs('secondShopper', 'DELETE', …)` before the UI flow.
- Vuetify overlay nuance: on dialog open, focus lands on `.v-overlay__content` (the card's *parent*), so `focusIsIn` walks up to that class before checking containment.
- The country selector requires the option list to be *visible* before pressing ArrowDown; the test waits for `.v-overlay--active [role=option]` to be visible to avoid a mid-animation focus failure.
- The refund assertion reloads the page and uses a 20 s timeout because the refund is an async payment-module side-effect of the cancel, not an immediate DOM update.
