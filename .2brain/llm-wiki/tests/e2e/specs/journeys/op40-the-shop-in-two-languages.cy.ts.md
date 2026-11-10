---
source: tests/e2e/specs/journeys/op40-the-shop-in-two-languages.cy.ts
sha256: 17e8340b48c5b457388642719c42f39049222311ed60831415f979ef3a455506
signature: 4167f9be11d7e68d2ab7ed552e36d153aa4b2c679ba38b54796868fee88b186b
generated_at: 2026-11-10T07:18:47.723703+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op40-the-shop-in-two-languages.cy.ts

## Purpose

Cypress end-to-end journey test verifying that a customer whose saved language is Italian receives the shipment-confirmation email in Italian (not the warehouse's English), that the product editor retains a typed Italian-formatted price across two language switches, that a stale save is rejected with an Italian error message, and that the shop manager's order-list status chips render in Italian rather than English.

## Key elements

- **`TRACKING_CODE`** (`'OP40-TRACK-001'`) — the tracking number typed into the ship dialog; asserted to appear in the order detail after shipping.
- **`TYPED_PRICE_IT`** (`'41,50'`) — the comma-separated price the editor types; used to verify the field survives `en → it` and `it → en` switches.
- **`switchTo(tag)`** — clicks the app-bar language switcher and selects `en` or `it`, then asserts `<html lang>` updated.
- **`describe('OP40 · …')`** — single spec with one `it` block. The test walks through: save Italian preference → warehouse ships (English UI) → assert Italian email → editor types price, switches languages twice → stale-save rejection → manager sees Italian status chips.
- **`beforeEach`** — visits `/en`, runs `cy.restore()` (fixtures reset), revisits `/en`.

## Relationships

- **`scripts/e2e/mail-filters.ts`** — imports `byTemplate` and `inLocale` helpers. These are composed into a predicate (`byTemplate('delivery.shipment-shipped')(mail) && inLocale('it')(mail)`) and passed to the `cy.emailTo` assertion to verify the shipped-mail template and its locale.

## Notes

- The header comment `requires-module: account, delivery, orders, products` signals which fixture modules must be loaded before this spec runs.
- Stale-save verification is triggered by a concurrent `cy.apiAs('admin', 'PATCH', …)` call that changes the product price behind the form's back, so the subsequent form submit hits a 409/conflict path.
- To leave the dirty editor form without tripping the browser's unsaved-changes prompt, the test navigates via `cy.visit('/en')` rather than using the menu sign-out (which would open a confirmation dialog over a dirty form).
- The Italian status-chip assertion uses a negative regex (`not.to.match(/^(Shipped|Not started|Delivered|On hold)$/)`); it checks absence of English strings rather than asserting specific Italian text.
