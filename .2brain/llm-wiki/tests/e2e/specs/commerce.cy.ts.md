---
source: tests/e2e/specs/commerce.cy.ts
sha256: 358034e19ce7e0b860aa75b37c780f4ad46801360aa8b91d0c4e71b6cb26f22b
signature: 0b7bb810a18126e00f824dc0c03919e1c32b4d174832654416158dd9ca820afd
generated_at: 2026-11-10T06:42:55.067368+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/commerce.cy.ts

## Purpose

End-to-end Cypress spec that walks the full commerce lifecycle across two sessions: the customer selects express shipping, is declined, completes a 3-D Secure payment, and cancels a paid order; the admin corrects the order to `processing`, ships it through the shipment panel, marks it delivered, and verifies the inventory ledger received the delivery with the correct counter movement. Exists to prove the payment state machine, the shipment panel, and the inventory ledger behave as a connected system, not as isolated features.

## Key elements

- **`correctStatusTo(label: RegExp)`** — Drives the `override:Order` permission on the order edit page to move an order to a target status. Picks the override status option, types a reason, clicks confirm, and asserts the success toast. Used here to reach `processing` because the spec's concern is shipping/ledger, not the ordinary `POST /orders/{id}/process` arc.
- **`it('the customer ships express, gets declined, pays, and can still cancel')`** — Full customer arc: add to cart → express checkout → declined card (form stays) → 3-D Secure challenge (bank confirm + finish) → payment succeeded → cancel via app dialog.
- **`it('the admin ships via the shipment panel, marks it delivered, and the ledger remembers why')`** — Customer buys & pays (standard) → admin logs in → `correctStatusTo(/processing/i)` → `shipTheOpenGroup('TRK-E2E-0001')` → verifies tracking on the order page and the `delivery.shipment-shipped` email in the outbox → marks delivered (button disappears) → navigates to inventory, records a delivery receipt, and asserts `movement-row` shows `Received` with `onHand` increasing and `reserved` at 0.
- **`beforeEach`** — Visits `/en`, calls `cy.restore()`, re-visits `/en` to reset app state between tests.

## Relationships

- **`tests/support/e2e/scenario.ts`** — Provides `seedAccount`, used to resolve a seeded user's email address for the post-logout assertion in the admin test.
- **`tests/support/e2e/steps.ts`** — Provides `shipTheOpenGroup`, which encapsulates the shipment-panel interaction (selecting the open group, entering the tracking code, and submitting).

## Notes

- **Two-session discipline:** Each `it` builds its own state and never reloads mid-arc. No assertion depends on a prior test's data surviving a page load (same convention as `journey.cy.ts`).
- **`liveProfile` guard:** The email-outbox check is wrapped in a `cy.env(...)` conditional rather than a top-level `cy.skipUnlessDemo()`, because the surrounding assertions (shipment panel, delivery mark, ledger) are the things the live profile is meant to prove. The outbox endpoint (`GET /__test/emails`) is only mounted when `NODE_DEMO=true`.
- **Override vs. process:** `correctStatusTo` deliberately takes the `override:Order` permission path (one-way into `processing`) rather than the ordinary `POST /orders/{id}/process`. The two are distinct arcs; this spec is about shipping and the ledger.
- **Dual-column inventory assertion:** The receipt assertion checks *both* `onHand` (increases) and `reserved` (stays 0). A ledger that moved the wrong counter would still render a row; asserting only one column would miss the bug.
- **`requires-module` header:** The leading comment lists the backend modules (`cart`, `delivery`, `inventory`, `orders`, `payments`, `products`) that must be running for this spec to pass — a checklist, not a runtime import.
