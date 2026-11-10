---
source: tests/e2e/specs/journeys/op24-ship-in-two-goes.cy.ts
sha256: 472484f0f0d8b7b1651fdc697023234f3d3bacc73ff092387f6378959a746758
signature: cb20ac0e8cd38ae983f07a5e8bf401ec7f09b28ea806900b37cbd3878dae6e6d
generated_at: 2026-11-10T07:14:49.186612+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op24-ship-in-two-goes.cy.ts

## Purpose

E2E journey test for the "partial shipment" flow (OP24): an order seeded with one already-shipped unit is completed by the admin shipping the remainder as a second shipment, then delivering each shipment independently. The test verifies that order status, fulfillment status, the customer-facing email sequence, and the withdrawal deadline all transition correctly only after the *last* shipment is delivered.

## Key elements

- **`TRACKING_CODE`** (`'TRK-E2E-OP24'`) — constant used for the second shipment's tracking number; asserted in UI, email, and timeline.
- **`OrderLike`** — minimal interface (`status`, `fulfillmentStatus`, `withdrawUntil?`) describing the order slice the test reads via the API.
- **`customerSees(orderId, status, fulfillmentStatus)`** — helper that calls `cy.apiAs('user', 'GET', /orders/:id)` and asserts both status fields, giving a single point to check server-side order state.
- **`describe('OP24 · Ship an order in two goes')`** — single test case with five `cy.step` blocks covering: initial partly-shipped state, second-shipment creation, email verification for tracking, first-delivery (order still "shipped"), second-delivery (order becomes "delivered" + deadline appears), and final customer-view assertions.

## Relationships

- **`scripts/e2e/mail-filters.ts`** → imports `byTemplate`, used to filter incoming emails by their template ID before content assertions.
- **`scripts/e2e/mail-message.ts`** → imports `mailMentions`, used to assert (or deny) that an email body contains a specific string (tracking code, "You may withdraw…").
- **`tests/support/e2e/steps.ts`** → imports `shipTheOpenGroup`, the reusable UI step that clicks through the admin ship dialog and enters the tracking code.

## Notes

- The test relies on a seeded fixture `order.partiallyFulfilled` (3 units, 1 already shipped). Without that seed the "partly shipped" pre-state won't exist.
- `beforeEach` visits `/en`, calls `cy.restore()` (DB reset), then visits again — the pattern is required so the seeded order is available and the UI re-hydrates.
- The withdrawal-deadline assertion is the terminal check: it confirms the `withdrawUntil` field is a non-null string *only* after the second delivery, not after the first.
- All state transitions are asserted via the API (`customerSees`) rather than UI text alone, per the file's stated invariant that "the screen follows the server."
