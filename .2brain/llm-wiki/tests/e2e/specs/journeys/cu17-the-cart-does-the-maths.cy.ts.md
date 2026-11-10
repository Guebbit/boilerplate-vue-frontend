---
source: tests/e2e/specs/journeys/cu17-the-cart-does-the-maths.cy.ts
sha256: 1776eec141bfa6510bdb2c09cb1be092607df38085295805a7d3b12dfae20894
signature: 89cf9bc5b0d4fb721dd2459ec9739e0097483905c1cd6be05f61dadef0562b82
generated_at: 2026-11-10T06:55:43.003604+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu17-the-cart-does-the-maths.cy.ts

## Purpose

End-to-end Cypress test for CU17 ("The cart does the maths"). Verifies that every numeric element in the cart stays internally consistent—bar count, bar money, per-line `unit × quantity = total`, items + shipping = grand total—and that rapid quantity-stepping debounces to a single API call carrying the final value. Also covers the per-line quantity cap (UI disables, server refuses, product page shows an error) and the clear-cart → empty-state → back-to-catalogue flow. No payment is exercised.

## Key elements

- **`BAR_MONEY`, `BAR_BADGE`, `BAR_COUNT`** — CSS selectors for the top-bar money display, badge wrapper, and the Vuetify badge bubble (the only place the unit count is rendered).
- **`readLine(text)`** — Parses a line's `"unit × qty = total"` label into `{ unit, quantity, total }` in cents, used to assert per-line arithmetic.
- **`describe` / `it` block** — A single scenario that walks: add from grid → add from detail page → rapid quantity stepping → line-total check → summary (items + shipping) → remove a line → per-line cap (10) → clear cart → empty state → redirect to catalogue.

## Relationships

- **`tests/support/e2e/steps.ts`** — Supplies the shared step helpers used throughout: `addOpenProductToCart`, `searchAndOpenProduct`, `shouldShowCents`, `refusedWith`, and the re-exported `cents` formatter.
- **`tests/support/e2e/harness.ts`** — Provides `loginDevice` to obtain an authenticated device token for the API-level assertions (cap refusal, cart GET).
- **`scripts/e2e/cents.ts`** — Source of the `cents()` conversion helper (imported into this file via the `steps.ts` re-export); all monetary assertions go through it to avoid floating-point drift.

## Notes

- **Debounce assertion:** After three `.click()` on `cart-increase` and one on `cart-decrease`, the test waits on the single intercepted `PATCH` and then asserts `@setQuantity.all` has length exactly 1—guarding against a burst of requests.
- **Cap = 10 is hardcoded:** The test sets the quantity to 10 via a raw `cy.apiAs` PATCH, reloads, and then checks that the UI button is disabled, the server returns 422 for 11, and the product page shows the "maximum quantity" error message.
- **`BAR_COUNT` relies on a Vuetify class:** `.v-badge__badge` is not a test hook; if Vuetify renames it, this selector breaks silently.
- **`beforeEach` uses `cy.restore()`:** State is reset by restoring the seeded DB snapshot, so each run starts from a known cart-empty baseline.
- **Shipping is flat-rate "Express":** The test asserts shipping > 0 but does not validate a specific amount, since the seeded customer's address is assumed to be in range.
