---
source: tests/e2e/specs/journeys/cu15-another-address-and-a-note.cy.ts
sha256: 08b4bea5aa9bb58e6aa9a25e690ce42bd6df9ec08d20ccb8bf4399e6d4f87c0a
signature: 08b4bea5aa9bb58e6aa9a25e690ce42bd6df9ec08d20ccb8bf4399e6d4f87c0a
generated_at: 2026-11-10T06:54:58.101066+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu15-another-address-and-a-note.cy.ts

## Purpose

End-to-end journey test (CU15) verifying that a customer with one saved address can add a second at checkout, ship to the new one, bill to the original, leave an order note, and that both the customer profile and the admin order view reflect the correct addresses and note.

## Key elements

- **`NOTE`** — constant string (`'Leave it with the concierge, ring twice.'`) used as the order note typed by the customer and asserted in both customer and admin views.
- **`describe('CU15 …')`** — top-level suite; `beforeEach` visits `/en`, restores fixture state via `cy.restore()`, and revisits.
- **`it('the customer adds a second address…')`** — single test covering the full journey: add to cart, select shipping, add a second address via the "add" button in the picker, verify the new radio is checked, re-point billing to the first address, type the note, checkout, assert frozen order fields, check the profile shows two addresses, then `switchUser('admin')` to read the note and addresses on the order page.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports three helpers:
  - `addToCartFromStorefront` — adds a named product to the cart from the storefront.
  - `fillAddressDialog` — fills the address-dialog form fields (label, name, street, zip, city, country) in one call.
  - `idFromLocation` — extracts the order ID from the current URL after checkout.

## Notes

- The `// requires-module:` header lists six feature modules (account, cart, delivery, inventory, orders, products); the test runner or harness likely uses this to gate execution.
- Address-picker radios are identified by the attribute prefix selector `[data-test^=address-picker-]` (the id is dynamic). Billing picker uses the analogous `[data-test^=billing-address-picker-]`.
- Billing defaults to "same as shipping" (`billing-address-picker-same`); the test explicitly clicks the first saved address to override it.
- The test asserts the order **does not** contain the old street in the shipping block and vice-versa, guarding against the address book leaking the default into the order.
- `cy.restore()` is called after the first visit to reset DB/state before the test body runs.
