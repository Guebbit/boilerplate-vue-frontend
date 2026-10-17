---
source: tests/e2e/specs/journeys/op24-ship-in-two-goes.cy.ts
sha256: 69028c1728eeae3bb958af414ffea71369a57a5639aa1b6dadc58c06b552d9e6
generated_at: 2026-10-17T02:21:19.957271+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op24-ship-in-two-goes.cy.ts

## Purpose

End-to-end journey test for the "ship in two goes" workflow (OP24). Verifies that when an order is partially fulfilled (1 of 3 units already shipped), the admin can ship the remainder as a second shipment, that each shipment can be marked delivered independently, and that the order only reaches `shipped` / `delivered` status and exposes the customer withdrawal deadline after the *last* shipment has left / arrived.

## Key elements

- **`TRACKING_CODE`** (`'TRK-E2E-OP24'`) — the tracking identifier the admin enters for the second shipment; also asserted visible to the customer.
- **`OrderLike`** — minimal typed shape (`status`, `fulfillmentStatus`, `actions?.withdrawUntil`) used to parse the customer-facing API response.
- **`customerSees(orderId, status, fulfillmentStatus)`** — helper that hits `GET /orders/:id` as the `user` role and asserts the two status fields, keeping the test's state assertions server-side rather than scraping the UI.
- **`describe('OP24 · Ship an order in two goes')`** — single `it` block walking through: initial partly-shipped state → second shipment created → first shipment delivered (order still `shipped`) → second shipment delivered (order becomes `delivered`, `withdrawUntil` appears) → customer view shows both shipments and no actionable buttons.
- **`beforeEach`** — visits `/en`, runs `cy.restore()`, visits again to reset app state.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `shipTheOpenGroup`, which encapsulates the admin action of filling a tracking code and submitting the "ship" form. The test passes `TRACKING_CODE` to it and then asserts the post-ship UI state itself.

## Notes

- The test intentionally reads order state from the API between each UI step (via `customerSees`) rather than deriving status from visible text, so the assertions are decoupled from rendering.
- `cy.subjectId('order.partiallyFulfilled')` pulls a pre-seeded order fixture; the test does not create its own order.
- The `beforeEach` pattern (visit → restore → visit) is a project-wide convention for resetting in-memory state between journeys.
- The `// requires-module: account, delivery, orders` comment at the top signals which server-side feature modules must be enabled in the test environment.
