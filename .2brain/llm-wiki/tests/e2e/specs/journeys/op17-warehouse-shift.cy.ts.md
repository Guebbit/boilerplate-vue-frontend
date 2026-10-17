---
source: tests/e2e/specs/journeys/op17-warehouse-shift.cy.ts
sha256: a3147371b5eb82ab4753f6e060d3605f48ba2c15d39888ff75f7262c395a3398
generated_at: 2026-10-17T02:19:52.722557+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op17-warehouse-shift.cy.ts

## Purpose

A single-scenario Cypress journey test that exercises the **warehouse** role end-to-end: receiving an inventory delivery, shipping a physical order with a tracking code, fulfilling a digital order without shipping, and receiving a returned parcel with a handling deduction. It also verifies that the warehouse role is denied access to other admin pages and cannot cancel or edit orders. The scenario exists to confirm the warehouse's read-only + fulfilment boundary across the full order lifecycle.

## Key elements

- **`TRACKING_CODE`** – Hard-coded value (`TRK-E2E-OP17`) the warehouse types into the ship form; later asserted in the customer's email.
- **`DEDUCTION_CENTS`** – Fixed handling fee (300 ¢) the warehouse retains on a returned parcel; used to verify the final refund amount.
- **`OrderLike` / `ReturnLike` / `PaymentLike`** – Minimal response-shape interfaces for API assertions (status, orderId, amount).
- **`adminMenuLinks()`** – Opens the admin nav menu, collects all `href` values, closes the menu with Escape, and returns the list as a chainable. Used to assert which pages the warehouse can and cannot see.
- **`isTurnedBack(path)`** – Visits a forbidden path and asserts the user lands on `/en` with a `.v-alert` component (the app's "access denied" redirect).
- **`aPaidDigitalOrder()`** – API-only setup: customer adds a digital product to cart, checks out, admin records an offline cash payment. Returns the order id for the warehouse to fulfil later.
- **`describe → it` block** – One long test broken into `cy.step` sub-steps: background setup (digital order + approved return), menu/permission checks, delivery receipt, express ship-and-deliver, digital fulfil, return receipt with deduction, and customer-side read-back.

## Relationships

- **`tests/support/e2e/steps.ts`** – Provides `centsOf` (parses a currency-formatted DOM element into cents for assertions) and `checkoutAs` (drives the guest checkout flow via API) used in the digital-order setup and refund verification.
- **`tests/support/e2e/harness.ts`** – Provides `loginDevice` and `requestAsDevice` to make a raw server request as the warehouse role and assert a 403/404 on the cancel-order endpoint (server-side permission check beyond the UI).
- **`scripts/e2e/mail-message.ts`** – Provides `mailMentions`, a predicate that checks whether a captured email body contains a given string (the tracking code), used to confirm the customer received the shipping notification.

## Notes

- The top-of-file `requires-module` comment lists the backend modules that must be seeded (`account, delivery, inventory, orders, products, returns`); the test depends on pre-seeded subjects (`product.digital`, `return.requested`, `order.paidExpress`) via `cy.subjectId()`.
- `beforeEach` visits `/en`, calls `cy.restore()`, then visits `/en` again—this is the project's standard state-reset pattern, not a double navigation for rendering.
- The deduction is entered in **dollars** in the UI (`DEDUCTION_CENTS / 100`), but all monetary assertions compare in **cents** via `centsOf`—watch for unit mismatches when editing.
- The test asserts the warehouse **cannot** cancel a paid order both in the UI (no cancel button) and at the API level (403/404), confirming the restriction is enforced server-side, not just hidden.
- There is no interaction with `src/modules/cart/tests/guest-cart.property.spec.ts` visible in this file; that graph edge is likely a shared-seed or fixture relationship rather than a direct import.
