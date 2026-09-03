# tests/e2e/specs/commerce.cy.ts

## Purpose

End-to-end spec for the full commerce lifecycle across two sessions: the customer purchases, watches a declined payment bounce back, retries successfully, and cancels a PAID order; the admin then advances a paid order through shipping, the courier delivers, and the inventory ledger records the receipt with a reason. Each test is self-contained (no cross-test state) and exercises only transitions the API actually permits.

## Key elements

- **`moveOrderTo(label, text)`** — Helper that opens the Vantec/v-select status dropdown on the order-edit page, clicks the option matching `label`, and asserts the submitted confirmation. Advances the order exactly one step (paid → processing → shipped) because the API rejects non-adjacent jumps.
- **`beforeEach`** — Visits `/en`, calls `cy.resetState()`, re-visits. Guarantees a clean slate for each test.
- **Test 1: customer ships express, gets declined, pays, cancels** — Adds a product to cart, picks express shipping, checks out, attempts payment with `4000 0000 0000 0002` (demo-provider declined number), verifies the form is still present (order still pending), retries with `4242 4242 4242 4242`, confirms "Paid", then exercises the cancel path (app dialog, not browser `confirm`).
- **Test 2: admin ships, courier delivers, ledger remembers why** — Re-buys and pays as the customer (because `pending` cannot jump to `shipped`), logs out, logs in as admin, navigates to the order by ID, advances processing → shipped via `moveOrderTo`, verifies the shipment panel + tracking code (`TRK-…`), checks the demo email outbox for the `delivery.shipment-shipped` template, clicks the courier-advance button (asserts it disappears after one use), then records a receipt in inventory and asserts the movement row shows `+` on-hand and `0` reserved.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Order-row assertions use `at.least 1`, not `1`.** The seed data for the test user already contains orders; the just-placed order is newest (`.first()`), but the table length is not a clean invariant.
- **Declined-card retry is part of the assertion.** The spec explicitly verifies the payment form and cancel button still exist *after* the decline, proving the order is still pending and retryable.
- **Email-outbox check is guarded by `liveProfile`.** `GET /__demo/emails` is only mounted when `NODE_DEMO=true`; in a live profile the email is sent for real and there is nothing to read. The guard is inline (not `cy.skipUnlessDemo`) so the surrounding live-profile assertions (shipment panel, courier, ledger) still run.
- **Courier-advance is idempotent-by-absence.** The test clicks once, asserts "Delivered", then asserts the button is gone (`should('not.exist')`). A second click is not possible by design.
- **Inventory receipt asserts both counters.** The movement row must show a positive on-hand change *and* reserved `= 0`; a bug that moved the wrong counter would still render a row.
- **Log-out before admin login is required.** An authenticated session visiting `/login` redirects away, so `cy.loginAs('admin')` would never find the form. The spec captures the order ID from the URL before logging out.
