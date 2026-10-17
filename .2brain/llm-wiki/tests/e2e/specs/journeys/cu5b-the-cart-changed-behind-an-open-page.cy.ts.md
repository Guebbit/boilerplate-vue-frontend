---
source: tests/e2e/specs/journeys/cu5b-the-cart-changed-behind-an-open-page.cy.ts
sha256: d8ee1b3c291df1d4c270b7cb0cc88adbdde3dfe3ffa38c381294e65b78a71018
generated_at: 2026-10-17T02:14:09.207550+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu5b-the-cart-changed-behind-an-open-page.cy.ts

## Purpose

End-to-end test for journey CU5b: verifying that a cart page reacts correctly when the server-side cart state changes while the page remains open. It covers two sub-scenarios — quantity changed by a "second tab" (API), and price repriced by an editor behind the open page — and asserts the page re-reads, surfaces the conflict (409), and lets the customer retry at the corrected total.

## Key elements

- **`describe('CU5b · The cart changed behind an open page')`** — top-level suite; `beforeEach` resets state via `cy.restore()` and re-visits `/en`.
- **`it('shows the server cart again when the customer comes back…')`** — adds 1 unit via storefront, clicks the increment stepper (debounced PUT), then fires a `PUT /cart/:id` with quantity 5 as another user-tab. Dispatches a `focus` event on the window and asserts the cart item now reads "Quantity: 5".
- **`it('refuses an order placed at a total the page no longer has…')`** — adds product to cart, enables checkout via pickup, then a PATCH as `editor` raises the product price by 1200 ¢. First "Place order" click is refused (page shows "The total changed from…", cart still populated); second click places the order; final assertion reads the order via API and checks `totalPrice` equals the raised amount.
- **`ProductLike` / `OrderLike`** — minimal typed slices used to constrain `cy.apiAs<…>` generics.
- **Constants** — `RAISE_CENTS` (1200), `SHOWN_UNITS` (2), `OTHER_TAB_UNITS` (5).

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the four imported helpers: `addToCartFromStorefront` (storefront add-to-cart flow), `centsOf` (reads a cent value from a DOM element), `idFromLocation` (extracts an ID from the current URL), and `shouldShowCents` (asserts a cent display matches a callback-supplied value).

## Notes

- Requires the **account, cart, inventory, and products** modules (see `// requires-module` comment).
- The first test relies on the stepper being **debounced**; it explicitly intercepts the `PUT **/cart/*` and waits for it before the "other tab" write, ensuring ordering.
- Window-focus simulation is done manually via `win.dispatchEvent(new Event('focus'))` rather than `cy.window()` focus — there is no built-in Cypress command for this.
- Both checkout-button clicks use `{ force: true }` because prior-step toasts can overlap the button's hit area.
- The `beforeEach` calls `cy.visit('/en')` **twice** (once before `cy.restore()`, once after) — the first visit is likely required to seed the `cy.restore()` snapshot; don't remove it.
- The 409 path is verified indirectly: the test checks the error message, the unchanged cart via `GET /cart`, and the still-present `/cart` pathname rather than asserting on the HTTP status code directly.
