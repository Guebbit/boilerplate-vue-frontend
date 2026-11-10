---
source: tests/e2e/specs/journeys/fr17-switch-language-mid-checkout.cy.ts
sha256: 2380e5b6ddf76a09b2e0742c250ddca8913faaf190814d99c5d378e072fa06c7
signature: 2380e5b6ddf76a09b2e0742c250ddca8913faaf190814d99c5d378e072fa06c7
generated_at: 2026-11-10T07:05:32.428563+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr17-switch-language-mid-checkout.cy.ts

## Purpose

End-to-end journey test for **FR17**: switching the app language to Italian while in the middle of checkout. Verifies that a delivery method, a newly added address, and a free-text delivery note all survive the language switch, that the resulting order page is in Italian with the note intact, and that the confirmation email is sent in Italian.

## Key elements

- **`NOTE`** – constant holding the delivery-note string the customer types (`"Leave it with the concierge, ring twice."`), reused for both input and later assertions.
- **`describe('FR17 …')`** – single spec with one `it`. The `beforeEach` visits `/en`, calls `cy.restore()`, then visits `/en` again to reset state.
- **`it('keeps the delivery, the new address and the note …')`** – the full journey:
  1. Logs in as `user`, adds `product.barebones` to cart.
  2. Selects the standard shipping method, opens the address dialog, fills it via `fillAddressDialog`, and types `NOTE` into `cart-notes`.
  3. Clicks the language switcher → Italian, then asserts `html[lang]="it"`, pathname `/it/cart`, shipping input still checked, address radio still selected, and the textarea still holds `NOTE`.
  4. Proceeds to checkout, asserts the order page is under `/it/orders/` and shows the note.
  5. Resolves the order ID via `idFromLocation()` and asserts the confirmation email matches the order-confirmation template in the Italian locale.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides the three step helpers used here: `addToCartFromStorefront` (adds a product to the cart), `fillAddressDialog` (fills the modal address form fields), and `idFromLocation` (extracts the order ID from the current URL path).
- **`scripts/e2e/mail-filters.ts`** – provides the `byTemplate` predicate (asserts the email matches a given template) and the `inLocale` predicate (asserts the email body is in a specific locale); both are combined in the final email assertion.

## Notes

- The `requires-module` comment at the top lists the server-side modules this test depends on: `account`, `cart`, `delivery`, `orders`, `products`.
- The JSDoc clarifies a UI constraint: the address dialog is **modal**, so the language switcher is unreachable while it is open. The test therefore models "switch mid-checkout" as *add address → close dialog → switch language*, not "switch while the dialog is visible".
- `beforeEach` calls `cy.visit('/en')` twice with `cy.restore()` in between; the first visit appears to be a warm-up / session setup before the database reset.
