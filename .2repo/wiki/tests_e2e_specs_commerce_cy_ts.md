# tests/e2e/specs/commerce.cy.ts

## Purpose

End-to-end test covering the two core commerce arcs: a customer buying with express shipping, experiencing a declined payment (demo decline card `4000 0000 0000 0002`), retrying successfully (`4242 4242 4242 4242`), and cancelling a paid order; and an admin advancing a paid order through `processing → shipped`, verifying the shipment panel / tracking email / courier delivery button, then recording a delivery receipt in the inventory ledger. Each `it` builds its own state and never reloads mid-arc.

## Key elements

- **`moveOrderTo(label: RegExp, text: string)`** — module-level helper that clicks the v-select on the order-edit page, picks the option matching `label`, submits the form, and asserts the "Order updated successfully" toast. Used to walk the status machine one step at a time (the API only offers legal next-states).
- **`describe('Commerce')`** — top-level suite; `beforeEach` visits `/en`, calls `cy.resetState()`, and visits again to start from a clean store.
- **Test 1: "the customer ships express, gets declined, pays, and can still cancel"** — full buyer flow: add to cart → select express shipping → checkout → attempt payment with the decline card (asserts form persists and order stays pending) → pay with the good card (asserts "Payment received" / "Paid" status) → cancel the paid order via the in-app confirmation dialog.
- **Test 2: "the admin ships, the courier delivers, and the ledger remembers why"** — customer buys and pays; then the test extracts the order id from the URL, logs out, logs in as `admin`, and navigates directly to `/en/orders/:id/edit`. Advances status via `moveOrderTo` (Processing → Shipped). Asserts the shipment panel shows a `TRK-` tracking code and "Shipped" status. Conditionally reads `GET /__demo/emails` (skipped when `liveProfile` is `true`) to verify a `delivery.shipment-shipped` template email carries the tracking prefix. Clicks the courier-advance button (asserts "Delivered" and button removal). Finally navigates to the inventory page, records a delivery receipt, and asserts the movement row shows `+` on hand and `0` on reserved.

## Relationships

No graph neighbors are recorded for this file. It depends on the shared helpers `cy.resetState`, `cy.loginAs`, `cy.navigateTo`, `cy.navigateViaMenu`, and `cy.logout` (presumably defined in a Cypress support/commands file), and on the `__demo/emails` endpoint that is mounted only when `NODE_DEMO=true`.

## Notes

- **Two sessions, no mid-arc reload.** Each test performs a full login → action → logout → login cycle within a single `it`. Nothing relies on store state surviving a page load.
- **Demo-only email assertion is inline-guarded**, not gated by a top-level `cy.skipUnlessDemo()`, because the surrounding assertions (shipment panel, courier, ledger) must run under the live profile too. The guard checks `cy.env('liveProfile')` before making the `__demo/emails` request.
- **Decline card is a Stripe-style test number** (`4000 0000 0000 0002`); the form must remain visible and the order must stay `pending` after the refused attempt.
- **`moveOrderTo` enforces single-step transitions** because the API's v-select only renders legal next-states; a direct `paid → shipped` jump is intentionally not possible through the UI.
- **Inventory receipt assertion checks both `onHand` (+) and `reserved` (0)** to catch a ledger that increments the wrong counter.
- **Login as admin requires logging out first** (`cy.logout()`), because an authenticated visit to `/login` redirects away and `cy.loginAs` would never find the form.
