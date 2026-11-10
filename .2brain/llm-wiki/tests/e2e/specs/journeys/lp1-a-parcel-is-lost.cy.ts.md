---
source: tests/e2e/specs/journeys/lp1-a-parcel-is-lost.cy.ts
sha256: 5e0351bca751555e7139e79cfcaa6cf1c21bbae63fa42391c9488cba644982ca
signature: 4877b8e5c6518e17fc45eda24eae8c06b25bd9aaf3e074b8dc0e5a03d1379efe
generated_at: 2026-11-10T07:10:29.829913+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/lp1-a-parcel-is-lost.cy.ts

## Purpose

End-to-end Cypress test covering the **LP1 "A parcel is lost"** journey. It verifies the full lifecycle when a warehouse reports a shipped parcel lost: the order reverts to *processing*, the buyer receives a public message (but never the internal note), the units can be re-shipped, or alternatively the buyer can cancel and be refunded with the order settling as *canceled* (not *delivered*).

## Key elements

- **`OrderLike`** — minimal interface (`status: string`) used to type the `cy.apiAs` response for order-status assertions.
- **`MESSAGE` / `NOTE`** — constants holding the buyer-facing message and the internal carrier-claim note, asserted against both the DOM and (in the cancellation path) the timeline copy.
- **Test 1 — "reopens the units … ships again, and tells the buyer without the note"**
  - Warehouse reports the parcel lost (reason "Lost by the carrier", note, message).
  - Asserts shipment status reads *Lost in transit*, the order is back to `processing`, and the ship button is visible.
  - Buyer views the message but the note element is absent; the report-lost trigger is also absent for the buyer.
  - Warehouse re-ships the same units; order returns to `shipped`.
- **Test 2 — "settles the order as canceled … when the buyer takes the refund"**
  - Warehouse reports the lost parcel (no note/message this time).
  - Buyer opens and confirms the "cancel remainder" action.
  - Asserts order status is `canceled`, `withdrawUntil` is `undefined`, timeline shows *Lost in transit, refunded*, and no *delivered* entry exists.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Fixture dependency:** `// requires-module: account, delivery, orders` signals that the test suite expects those modules' fixtures (especially a pre-shipped order) to be seeded before the spec runs.
- **`cy.restore()` in `beforeEach`:** resets DB state between tests; both specs start from a clean `order.shipped` fixture.
- **User-switching pattern:** `cy.switchUser('user')` / `cy.switchUser('warehouse')` toggles the authenticated actor mid-spec; the buyer assertions run under the `user` role.
- **API-level assertions:** order `status` is verified via `cy.apiAs` (GET `/orders/:id`) rather than DOM text alone, ensuring the backend state matches the UI.
- **`data-test` selectors:** all DOM interactions target `[data-test=…]` attributes; the lost-report flow uses a dialog (`[data-test=report-lost-dialog]`) that is expected to be gone after submit.
