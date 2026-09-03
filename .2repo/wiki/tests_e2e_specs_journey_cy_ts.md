# tests/e2e/specs/journey.cy.ts

## Purpose

End-to-end test that walks the full customer lifecycle in one continuous session: a guest browses and hits the sign-in wall, then a signed-in customer filters products, buys, checks out, cancels the order, and confirms the shelf stock has recovered. It exists to prove the app's state persists across navigation (one shared session) and that the cancel→restock round-trip is visible to the user.

## Key elements

- **`describe('The customer journey')`** – single `describe` block; `beforeEach` visits `/en`, calls `cy.resetState()`, then visits `/en` again to ensure a clean guest start.
- **`it('guest browses but cannot buy; the customer buys, cancels, and the shelf recovers')`** – the sole test case. Sequential phases:
  - *Guest phase*: navigates to `/en/products`, clicks the "food (1)" category chip, asserts one row, opens the product, confirms `add-to-cart` is disabled, "Sign in to buy" is shown, and wishlist toggle is absent.
  - *Login*: `cy.loginAs('user')` — the only reload in the journey.
  - *Buy phase*: re-navigates, filters, adds to cart, goes to cart (asserts exactly 1 item), clicks checkout, lands on `#orders-list-page`.
  - *Email check*: if not `liveProfile`, reads the outbox via `cy.demoEmailTo('gino@pino.it')` and asserts the template is `orders.order-confirm`.
  - *Cancel phase*: opens the newest order, clicks `order-cancel`, confirms via `app-dialog-confirm`, asserts cancellation toast, cancel button gone, and reorder button present.
  - *Shelf recovery*: dismisses all `.v-alert` toasts, navigates back to products, asserts the product still shows stock "30".

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Navigation discipline**: after login every step uses in-app links/buttons (`cy.navigateTo`, `cy.goToCart`) rather than `cy.visit`, because a full page reload would destroy the store/session the test is trying to verify.
- **`cy.resetState()` + second `cy.visit`**: resetting state is server-side only; the already-loaded page still holds the old session, so a second visit is mandatory.
- **Toast dismissal**: `.v-alert` elements overlay the table's action column. They must be closed individually (clicking the Vuetify close button) before any further row interaction, or clicks will land on the toast.
- **Filter persistence**: the store retains the active category filter. Re-clicking the chip *toggles it off*, which would re-render the unfiltered list and break subsequent row assertions. The test relies on the filter still being active.
- **Cart seeding**: the demo customer's cart starts empty (the seeded cart belongs to the admin account), so the single added line is the entire cart.
- **App vs. browser dialog**: the cancel confirmation uses `data-test=app-dialog-confirm`; Cypress auto-accepts only the browser-native `confirm()`, not in-app dialogs.
- **`liveProfile` guard**: the outbox assertion is skipped when `cy.env('liveProfile')` is `true`, since a real profile would send actual email.
- **Selectors**: all interactive elements are targeted via `data-test` attributes; page-level assertions use element IDs (`#products-list-page`, `#product-target`, `#order-target`, `#orders-list-page`).
