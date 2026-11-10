---
source: tests/e2e/specs/journeys/ac11-i-moved-house.cy.ts
sha256: 3f7dbf60a8f5f07127f780e993c7c7da75c7a78bb9c88a5f46861beda363dfa8
signature: 3f7dbf60a8f5f07127f780e993c7c7da75c7a78bb9c88a5f46861beda363dfa8
generated_at: 2026-11-10T06:44:37.070382+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac11-i-moved-house.cy.ts

## Purpose

End-to-end acceptance test (AC11) that verifies the single-source-of-truth contract for customer addresses: edits and new-default changes made in the profile are immediately reflected in the checkout address picker, and vice-versa. Covers the full round-trip of edit → add-default → checkout pre-select → delete-all → re-add-from-checkout, with no payment step.

## Key elements

- **`EDITED_STREET`** – constant (`'Via Nuova 99'`) used as the street value written during the edit step and later asserted in the picker.
- **`describe('AC11 · I moved house')`** – the suite; `beforeEach` visits `/en`, calls `cy.restore()` to reset backend state, then visits `/en` again.
- **Single `it` block** – a linear journey broken into five `cy.step()` segments:
  1. Edit the existing address to `EDITED_STREET`.
  2. Add a second address (`'ufficio'`, Bologna) and mark it default via the dialog checkbox.
  3. Go to cart, verify the picker pre-selects the new default and displays the edited street text.
  4. Delete both addresses in the profile; assert the empty state is shown.
  5. Return to cart, assert the picker shows its empty state with checkout disabled, add a new address from the picker, and confirm it becomes the selected choice and re-enables checkout.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides two helpers imported and used throughout the test:
  - `fillAddressDialog(…)` – fills and submits the address form dialog (called three times: edit, add-default, add-from-checkout).
  - `addToCartFromStorefront(…)` – adds a product to the cart so the checkout/picker flow can be exercised; called here with the argument `'product.barebones'`.

## Notes

- The `requires-module` header lists **account, cart, delivery, inventory, products** — the test touches all five; CI may gate on these module flags.
- Despite the "journey" naming, there is only one `it` block; the `cy.step()` calls are documentation markers, not separate tests. A failure in any step fails the whole spec.
- The test asserts via `[data-test=…]` attributes throughout; it does not rely on visible text except where `cy.contains` is needed to disambiguate picker rows.
- No currency, tax, or payment assertions appear anywhere in the file.
