---
source: tests/e2e/specs/journeys/cu15-another-address-and-a-note.cy.ts
sha256: 08b4bea5aa9bb58e6aa9a25e690ce42bd6df9ec08d20ccb8bf4399e6d4f87c0a
generated_at: 2026-10-17T02:10:02.197294+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu15-another-address-and-a-note.cy.ts

## Purpose

End-to-end journey test for CU15: a customer who already has one saved address adds a second at checkout, ships to the new one, bills to the original, and leaves a note for the shop. It verifies that checkout does not force the pre-existing entry, that billing defaults to "same as shipping" until explicitly overridden, that the frozen order carries both addresses and the note correctly, and that the admin can read the same data. No payment step is exercised.

## Key elements

- **`NOTE`** – Module-level constant holding the delivery-note text typed into the cart.
- **`describe('CU15 · …')`** – Single test suite; `beforeEach` restores a clean DB state via `cy.restore()`.
- **`it('the customer adds a second address …')`** – The entire journey in one test:
  - Adds `product.barebones` to cart, selects standard shipping.
  - Asserts one pre-existing address in the picker, then adds a second ("Studio" in Roma) via the add dialog.
  - Confirms the new address is auto-selected (checked radio), not the old default.
  - Confirms billing starts as "same as shipping," then explicitly switches it to the first address ("Via Pino 7").
  - Types `NOTE` into `cart-notes`, clicks checkout, verifies the order page shows shipping ≠ billing and the note.
  - Navigates to the profile to confirm both addresses appear.
  - Switches to admin, opens the order by ID, and re-verifies note and both addresses.

## Relationships

- **`tests/support/e2e/steps.ts`** – Provides the three helpers used here:
  - `addToCartFromStorefront(productKey)` – adds a product from the storefront.
  - `fillAddressDialog(fields)` – fills the "add address" dialog and submits.
  - `idFromLocation()` – extracts the order ID from the URL after checkout so the test can navigate to the admin order page.

## Notes

- Radio inputs inside the address picker carry `data-test="address-picker-<id>"` (dynamic). The test selects the new one by matching its visible text (`Via dei Coralli 12`) rather than by a stable ID.
- Billing follows shipping by default (`billing-address-picker-same` checked). Adding a new shipping address does **not** move the billing selection — it must be set explicitly.
- The test explicitly asserts the shipping address does **not** contain the old street and vice-versa, guarding against bleed between the two fields.
- Requires backend modules: account, cart, delivery, inventory, orders, products (see header comment).
- No card/payment fields are touched; the test stops after the order is created and the confirmation page is visible.
