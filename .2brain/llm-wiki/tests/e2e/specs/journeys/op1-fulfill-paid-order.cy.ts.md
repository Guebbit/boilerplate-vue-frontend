---
source: tests/e2e/specs/journeys/op1-fulfill-paid-order.cy.ts
sha256: 02f31656b8c7d222447662597fe2404fd6d75e2dfe185528cd0ee3417caa329f
signature: 59e31f9dfe7a989a397adcd440930782e5d4c65218190f575206eb9a9eb61440
generated_at: 2026-11-10T07:11:22.031868+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op1-fulfill-paid-order.cy.ts

## Purpose

Smoke-level E2E journey test that walks a paid express order from "paid" to "delivered" through the admin shipment panel. It asserts the correct set of action buttons is present (and the rest absent) at every intermediate state, verifies the tracking code is mailed to the customer on shipment, and confirms the delivery email carries the withdrawal deadline.

## Key elements

- **`TRACKING_CODE`** (`'TRK-E2E-OP1'`) — fixed value typed into the ship form; reused as the search needle in mail assertions.
- **`OrderLike`** — minimal API response shape (`status`, `fulfillmentStatus`, optional `withdrawUntil`) used for the two `cy.apiAs` reads.
- **`customerSees(orderId, status)`** — single `GET /orders/:id` as the `user` role, asserts the `status` field. One call per step by convention.
- **`describe('OP1 · …', { tags: '@smoke' })`** — the suite; runs in the smoke pass.
- **`beforeEach`** — visits `/en`, restores fixtures, re-visits `/en` (fresh page state per test).
- **`it('starts, ships … delivers …')`** — the single test body. Steps in order:
  1. Paid state: only `mark-started` visible; API confirms `paid`.
  2. Click start → `open-ship` appears, `mark-started` gone; API confirms `processing`.
  3. Open ship form, type `TRACKING_CODE`, submit → `shipment-tracking` shows code; API confirms `shipped`.
  4. Mail assertion: customer inbox contains the tracking code.
  5. Click deliver → all admin action buttons gone; API confirms `delivered`.
  6. Mail assertion: delivery template present, "has arrived" text present, withdrawal deadline line present.
  7. Log in as user, verify the customer page shows the tracking code and status, with no admin buttons.

## Relationships

- **`scripts/e2e/mail-filters.ts`** — provides `byTemplate`, called with the string `'delivery.shipment-delivered'` to match that mail template in the final assertion.
- **`scripts/e2e/mail-message.ts`** — provides `mailMentions`, used to assert specific substrings (tracking code, "has arrived") inside received mail bodies.
- **`tests/support/e2e/steps.ts`** — provides `withdrawUntilLine`, which formats the `withdrawUntil` date into the human-readable string expected in the delivery email.

## Notes

- The top comment says "the panel keeps 'ship' disabled until a code is typed," but the test step name and assertion (`should('not.be.disabled')` *before* typing) indicate the submit stays open so the code "may come later." If you change the UI gating, reconcile both.
- Every state transition asserts the *negative* set (buttons that must be absent) in addition to the positive one — this is the test's core contract.
- `cy.restore()` in `beforeEach` implies a fixture reset; the test depends on a pre-seeded `order.paidExpress` subject.
- The `requires-module` comment lists five backend modules (`account`, `delivery`, `inventory`, `orders`, `payments`); the test will fail if any is down.
- Tagged `@smoke`, so it runs in the short regression pass — keep it fast and deterministic.
