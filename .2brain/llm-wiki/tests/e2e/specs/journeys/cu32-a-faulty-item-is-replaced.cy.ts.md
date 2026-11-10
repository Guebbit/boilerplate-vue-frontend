---
source: tests/e2e/specs/journeys/cu32-a-faulty-item-is-replaced.cy.ts
sha256: 4c60c2af47bd0c661995ad84458bb05f63c166f293040604e0ce76e271c51b2e
signature: bd749cecb0e445d495251fa13253829bc19e2013d06c399366198864e3f58450
generated_at: 2026-11-10T07:00:05.739846+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu32-a-faulty-item-is-replaced.cy.ts

## Purpose

End-to-end journey test for CU32: a customer reports a defective item and requests a replacement. The test drives the full lifecycle—customer opens a return, support approves, warehouse receives with the replacement wish preselected, the order reopens with no refund, the replacement ships and arrives through the standard fulfillment pipeline, and the replaced unit remains returnable under its extended guarantee.

## Key elements

- **`OrderLike`, `PaymentLike`, `ReturnLike`** — Minimal local interfaces describing only the API fields this test reads (status, items, `preferredRemedy`, `refundAmount`, etc.).
- **`describe` / `beforeEach`** — Visits `/en`, calls `cy.restore()` to reset fixtures, then revisits. Requires modules: `account`, `delivery`, `inventory`, `orders`, `payments`, `returns`.
- **Single `it` block** — Runs the full multi-role journey (user → support → warehouse → admin) in one sequential flow using `cy.step` markers for readability.
- **`cy.subjectId('order.deliveredTwoLines')`** — Retrieves the pre-seeded order fixture (two lines, one already delivered) that drives the entire test.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `eventually` (polling helper used to wait for the `delivered` status), `orderMailTo` (asserts a status email was sent to the user), and `paymentOfOrder` (fetches the payment record to confirm zero refund).

## Notes

- Money and status assertions are always made against API responses (`cy.apiAs`), never by reading DOM text or summing page values.
- The order fixture has **two** lines; the second was already shipped before the return. After the return closes, the order reopens as `processing`, and the fulfillment-order lookup must find the one still `open`/`in_progress` rather than the already-shipped one.
- `force: true` is used on `.check()` calls because some inputs are inside conditionally-rendered forms (the remedy selector only appears after a reason is picked).
- The "guarantee" sub-assertion at the end only checks that the return-request button exists again on the order page—it does not re-run a full second return cycle.
- The replacement ships through the **standard** delivery endpoints (`/delivery/fulfillment-orders/…/shipments` → `/delivery/shipments/…/deliver`), confirming it is not a special "replacement" shipping path.
