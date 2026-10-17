---
source: tests/e2e/specs/commerce.cy.ts
sha256: f5bd466da6f1e750f8d809e9a91947079306a749de08b60db6a63f769213a406
generated_at: 2026-10-17T02:03:25.434017+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/commerce.cy.ts

## Purpose

End-to-end Cypress spec that walks the full commerce arc: a customer buys a product, exercises the payment panel (declined card → 3-D Secure challenge → successful payment), cancels a paid order; then an admin moves that paid order to processing, ships it through the shipment panel, marks it delivered, and verifies the inventory ledger recorded the receipt with the correct counters. The two `it` blocks are deliberately self-contained (each builds its own state, never relies on a prior test's store).

## Key elements

- **`correctStatusTo(label: RegExp)`** – Local helper that picks a status from the `override-status-select` on the order-edit page, types a reason, and clicks the override button. Used to move a paid order to `processing` via the override path (the ordinary `POST /delivery/order/{id}/start` is intentionally bypassed because the test's focus is shipping and the ledger, not the start transition).
- **`describe('Commerce')`** – Top-level suite. `beforeEach` visits `/en`, calls `cy.restore()`, then revisits `/en` for a clean session.
- **Test 1: "the customer ships express, gets declined, pays, and can still cancel"** – Adds a product to cart, checks out with express shipping, attempts payment with a declining card, retries with a 3-D Secure card (asserts the async `requires_action` → `paid` sync), then cancels the paid order and confirms the refund path.
- **Test 2: "the admin ships via the shipment panel, marks it delivered, and the ledger remembers why"** – Customer buys and pays for real (so the order is genuinely `paid`), admin logs in, uses `correctStatusTo` to reach `processing`, ships via the panel with a tracking code, verifies the tracking email in the test outbox, marks delivered, receives the delivery in inventory, and asserts the movement row shows `+` on-hand with `reserved = 0`.

## Relationships

- **`tests/support/e2e/scenario.ts`** – Provides `seedAccount`, used to look up the user's email for the logout assertion and to drive `cy.loginAs('user')`.
- **`tests/support/e2e/steps.ts`** – Provides `shipTheOpenGroup(trackingCode)`, which performs the shipment-panel submission on the admin's order-edit page.

## Notes

- **Module prerequisite**: the leading `requires-module` comment declares this spec needs `cart`, `delivery`, `inventory`, `orders`, `payments`, and `products`.
- **Payment path is explicitly 3-D Secure**: the second `cy.payWith` call exercises the `requires_action` → bank-challenge → sync sequence. Skipping it would leave the async half of the payment flow untested.
- **Email-outbox check is profile-gated, not test-gated**: the `GET /__test/emails` call is wrapped in a `liveProfile` env check *inline* rather than via `cy.skipUnlessDemo()` at the top, because the surrounding assertions (shipment panel, delivery mark, ledger) are exactly what the live profile is meant to prove. The pattern mirrors `journey.cy.ts`.
- **Inventory receipt asserts both columns**: the spec checks that `onHand` rises (`+`) *and* `reserved` stays `0`. A ledger that moved only one counter would still render a row and look plausible at a glance.
- **Override vs. ordinary start**: `correctStatusTo` uses the `override:Order` permission path. This is reachable without a re-auth dialog because `loginAs` just completed a real auth well inside the `stepUp: critical` window. The ordinary `mark-started` button is a different arc and is not exercised here.
- **Log-out before admin login**: `cy.loginAs('admin')` is preceded by `cy.logout()` because an authenticated visit to `/login` redirects away, so the login form would never be found.
