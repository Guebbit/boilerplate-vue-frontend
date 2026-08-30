# tests/e2e/specs/journey.cy.ts

## Purpose

A single end-to-end test that walks the shop as a real user would: a guest browses and hits the sign-in wall, then a logged-in customer filters, buys, checks out, cancels the order, and confirms stock is restored. After the one deliberate login reload, every subsequent navigation goes through in-app links and buttons—no deep `cy.visit`—so surviving session state across the journey is itself part of the assertion.

## Key elements

- **`beforeEach`** — Visits `/en`, calls `cy.resetState()` to clear the server-side session, then reloads `/en` so the page in front of the browser genuinely boots as a guest.
- **`it('guest browses but cannot buy; the customer buys, cancels, and the shelf recovers')`** — The entire journey in one test:
  - *Guest phase*: navigates to products, applies a category filter, opens a product, asserts the add-to-cart button is disabled, a "Sign in to buy" message is present, and the wishlist toggle is absent.
  - *Login*: `cy.loginAs('user')` (the only reload in the test).
  - *Purchase*: re-navigates to products, applies the same filter, adds to cart, goes to the cart via the account menu, checks out.
  - *Order verification*: asserts the orders list shows exactly one row (the new order; the seeded order is soft-deleted) and, unless `liveProfile` is set, reads the demo outbox to confirm an `orders.order-confirm` email was sent.
  - *Cancellation*: opens the order, clicks cancel, confirms via the app's own dialog (`[data-test=app-dialog-confirm]`), asserts the cancel button is gone and a reorder button is present.
  - *Stock recovery*: dismisses any stacked toasts, navigates back to products (filter is still applied from the store), opens the same product, asserts stock reads **25** again.
- **Custom Cypress commands relied upon**: `cy.navigateTo`, `cy.navigateViaMenu`, `cy.loginAs`, `cy.resetState`, `cy.demoEmailTo`.
- **`liveProfile` env flag**: gates the demo-outbox email assertion; when `true` the email is skipped (live profiles send real mail).

## Relationships

No graph neighbors are recorded for this file. Its runtime dependencies are the custom commands above (defined in the Cypress support layer) and the application under test itself.

## Notes

- **One reload, by design.** The only `cy.visit` after `beforeEach` is the login step. Every later page change is driven by clicking links/buttons, so if state (cart, filter, session) survives, the test proves a single shared session.
- **Filter is a toggle, not a set.** The app's store retains the active filter across navigation. After cancel, the test does *not* re-click the category chip—doing so would toggle the filter off and the row under it would be wrong. It instead waits for the one expected row that the stored filter already produces.
- **Toasts block the action column.** Before navigating back to the products list, all `.v-alert` toasts must be dismissed via their close buttons, or the next row-click lands on a toast overlay.
- **Demo customer cart starts empty.** The seeded cart belongs to the admin profile; the demo customer's single line is the one just added, so `have.length(1)` on `[data-test=cart-item]` is the full assertion.
- **App dialog vs. browser dialog.** The cancel confirmation uses the in-app dialog (`[data-test=app-dialog-confirm]`); Cypress auto-accepts only `window.confirm`, so the test clicks the app's own confirm button.
- All selectors use `data-test` attributes; no reliance on text or class structure beyond the Vuetify alert close button.
