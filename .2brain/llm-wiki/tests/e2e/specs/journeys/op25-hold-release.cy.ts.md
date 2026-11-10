---
source: tests/e2e/specs/journeys/op25-hold-release.cy.ts
sha256: 46f18a19b85aee33cf3b59b8cfb2d36fe6bb77de57dc3e2ec99195de26c23090
signature: 114a63fce647c0574e622a18656dbbe9d4f43301ad6a08db098c746ceff1e824
generated_at: 2026-11-10T07:15:00.241569+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op25-hold-release.cy.ts

## Purpose

Cypress E2E journey test for OP25: verifying the full staff hold/release lifecycle of a fulfillment group. It confirms that a seeded "High risk" hold is displayed correctly, that release makes the group shippable, that re-holding requires a reason (plus optional note and buyer message), that the buyer receives a masked notice and a transactional email, and that the timeline properly hides staff-only detail from the buyer.

## Key elements

- **`BUYER_MESSAGE`** — constant string (`"Is the flat number right?"`) used as the buyer-facing message when holding; later asserted in the sent email.
- **`OrderLike`** / **`FulfillmentLike`** — minimal structural interfaces for the API responses this test reads (`fulfillmentStatus`, `items[].id`).
- **`describe('OP25 · Hold a group back, then let it go')`** — single `it` block that walks through the entire journey in sequential `cy.step` segments:
  1. Admin sees the held card (reason, no ship button, `on_hold` status via API).
  2. Admin clicks release → status clears, ship button appears.
  3. Admin re-holds via the dialog → picks one of exactly 3 reasons, types note + buyer message, submits.
  4. Buyer receives an email whose subject mentions the address and whose body contains `BUYER_MESSAGE` (checked via `mailMentions`).
  5. Cancel on the hold dialog leaves state unchanged.
  6. Stale-dialog conflict: a concurrent API hold makes the UI submission fail and display an inline error.
  7. Timeline entries for `fulfillment_held` / `fulfillment_released` carry a `staff-only` marker for admin.
  8. Buyer view: no staff reason, no note, no timeline hold/release rows; only a generic "delayed" notice is shown.

## Relationships

- **`scripts/e2e/mail-message.ts`** — provides `mailMentions(mail, text)`, a predicate helper that checks whether an email body contains a given substring. Used to assert the buyer-facing message arrived in the transactional email.

## Notes

- The test relies on a pre-seeded subject (`cy.subjectId('order.onHold')`) and `cy.restore()` in `beforeEach`; without that fixture the scenario is unrunnable.
- The "stale dialog" step issues a raw `POST /delivery/fulfillment-orders/:id/hold` via `cy.apiAs` while the UI dialog is open, simulating a concurrent hold. The assertion is only that `[data-test=hold-error]` is non-empty — it does not check a specific message.
- The three staff hold reasons are asserted by count (`have.length, 3`); the specific set (`High risk`, `Incorrect address`, and one more) is implied but not enumerated in assertions. The doc comment notes `awaiting_stock` is intentionally excluded.
- `cy.emailTo` is a project-level custom command (not part of this file) that polls for a matching email; the predicate passed to it composes subject check with `mailMentions`.
