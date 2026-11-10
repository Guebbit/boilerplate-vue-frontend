---
source: tests/e2e/specs/journeys/op30-correct-a-tracking-code.cy.ts
sha256: 0834362860c6b1af0eedaf041fd20934bb55fc45b54d9cd06d90f2866621edb5
signature: c1033bff694d7c40da564f5d75926c3cb9de80773cb99f249dc2e7dc530b883e
generated_at: 2026-11-10T07:15:54.906259+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op30-correct-a-tracking-code.cy.ts

## Purpose

End-to-end journey test (Cypress) covering partial shipment of a two-unit paid order, correction of a mistyped tracking code, and the ship-dialog edge cases: cancel, out-of-range quantities, and a stale dialog when another actor ships the remainder first. It verifies that the buyer ultimately sees only corrected codes, that the audit log records the edit, and that delivery notifications carry the right values.

## Key elements

- **`TYPO` / `FIXED` / `SECOND` / `SECOND_FIXED`** — String constants for the four tracking codes used across the scenario (mistyped → corrected, and a second parcel's code → its post-delivery correction).
- **`FulfillmentLike`** — Narrow structural type describing the slice of fulfillment data the test reads (fulfillment orders + shipments with id, trackingCode, status).
- **`AuditListLike`** — Minimal type for the audit-log response used to assert a tracking-edit row appeared.
- **`fulfillmentOf(orderId)`** — Cypress chainable helper that fetches both `/orders/:id/fulfillment-orders` and `/orders/:id/shipments` as admin and returns a combined `{ fulfillmentOrders, shipments }` object.
- **`describe('OP30 · Ship in part, correct a tracking code')`** — Single `it` block that walks through: cancel, invalid quantities, ship 1 of 2 under a typo, correct the code, verify buyer email, trigger a stale-dialog error via admin API, deliver both parcels, correct a delivered parcel's code, and confirm the buyer sees only corrected values.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `eventually`, a retry-until-true helper, to poll the audit-log endpoint until the expected row is present.
- **`scripts/e2e/mail-filters.ts`** — Imports `byTemplate` to match an incoming email against a known shipment-shipped delivery template.
- **`scripts/e2e/mail-message.ts`** — Imports `mailMentions` to assert that an email body contains a specific tracking code or phrase.

## Notes

- The typo `TRK-OP3O` uses the **letter O** in place of the digit **0**; this is intentional and the test asserts the typo never appears in the buyer's final view.
- The save button (`data-test=shipment-tracking-save`) is disabled until the input value actually differs from the current code — the test explicitly clears then types to satisfy this.
- The stale-dialog scenario works by opening the ship dialog in the warehouse UI, then calling the admin API to ship the remainder *outside* the dialog; the subsequent submit should surface `data-test=ship-items-error` rather than succeeding.
- Header comment declares `requires-module: account, delivery, orders`, meaning the test fixture/seed must provision those modules before running.
