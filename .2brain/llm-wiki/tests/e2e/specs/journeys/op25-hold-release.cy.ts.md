---
source: tests/e2e/specs/journeys/op25-hold-release.cy.ts
sha256: e3d3baf96b8c16d6cd60ea0dc582cc43abca5597b0b1935ecce30321b878e5fc
generated_at: 2026-10-17T02:21:30.761794+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op25-hold-release.cy.ts

## Purpose

E2E Cypress spec for story **OP25**: a staff member views an order on hold, releases it, then holds it again by selecting a reason and adding a note. The test verifies that the order card's displayed status, hold reason, and action buttons stay in sync with the API-level `fulfillmentStatus` at every step.

## Key elements

- **`OrderLike`** – minimal interface (`{ fulfillmentStatus: string }`) used to type the API assertion payload.
- **`describe('OP25 · Hold a group back, then let it go')`** – single test suite; `beforeEach` runs `cy.restore()` (DB seed reset) sandwiched between two `cy.visit('/en')` calls.
- **`it('releases a staff hold, and puts the group on hold again with a reason')`** – the only test. Flow:
  1. Loads the seeded order via `cy.subjectId('order.onHold')`, logs in as `admin`, and asserts the card shows "On hold", the "High risk" reason, and **no** ship/release buttons.
  2. Clicks `[data-test=release]`, asserts the status flips to "Not shipped yet" and the ship button reappears; confirms via API that `fulfillmentStatus` is no longer `on_hold`.
  3. Opens the hold dialog, asserts the submit button is disabled, selects "Incorrect address" from a 3-option listbox, types a note, submits, and verifies the card and API both reflect the new hold.

## Relationships

No graph neighbors are registered for this file. It depends at runtime on the seeded fixture `order.onHold` and on the `account`, `delivery`, and `orders` modules (declared via the `requires-module` header comment), but those are not tracked as code-level dependencies.

## Notes

- The `beforeEach` pattern (`visit → restore → visit`) is the project convention for resetting DB state between specs; the first visit is only to establish a session before the restore.
- The spec asserts **exactly 3** reason options in the listbox. Per the header comment, `awaiting_stock` is a stock-level reason and is deliberately excluded from the staff hold dialog.
- All UI interactions target `data-test` attributes; no text-based selectors are used for actions, only for read-only status/reason labels.
- The test asserts both the UI card **and** the API response (`cy.apiAs`) at each state change, guarding against a UI/API drift.
