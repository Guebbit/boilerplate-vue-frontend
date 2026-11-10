---
source: tests/e2e/specs/journeys/op31-a-refund-the-provider-refuses.cy.ts
sha256: a65664128792647bcdca9214ab51507f6bb869fe14b0827d797ffa2289a45a09
signature: fae07cdcbb0d81c9c0bcc8cb31207561e6eb322c9730ee9a2a80f87c8aaa712d
generated_at: 2026-11-10T07:16:19.519632+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op31-a-refund-the-provider-refuses.cy.ts

## Purpose

End-to-end journey test for **OP31**: a moderator initiates a refund on a paid order, the (fake) card network refuses it, and the test walks through the full lifecycle — refusal shown in the drawer and Refunds tab, staff-only timeline entry, the open refund surfacing in the Needs-attention tab after a time jump, and the retry sweep completing the refund once the provider clears it, ending with the payment marked *Refunded* and the buyer's refund-issued email delivered.

## Key elements

- **`TimelineRowLike`** — local interface (`{ type: string }`) describing the minimal shape of a timeline row as this test reads it.
- **`timelineTypes(role, orderId)`** — local helper that calls `GET /orders/:id/timeline` as the given role (`'moderator'` or `'user'`) and returns a `Cypress.Chainable<string[]>` of row `type` values. Used to assert the staff timeline contains `refund_failed` while the buyer's does not.
- **`describe` / `it` block** — single test case (`fails visibly, waits in Needs attention, and completes once the provider lets it through`) that exercises the entire journey in one linear flow.
- **`beforeEach`** — gates the suite with `cy.skipUnlessDemo()`, then resets state via `cy.restore()` and re-visits `/en`.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `failRefundsOf`, the lever that simulates the provider's refusal (set to `'insufficient_funds'`) and later clears it (set to `null`) so the sweep can complete the refund.
- **`scripts/e2e/mail-filters.ts`** — provides `byTemplate`, used in the final step to assert the correct email template was delivered to the buyer.

## Notes

- **Demo-only**: the `beforeEach` calls `cy.skipUnlessDemo()`, so this test is skipped in non-demo CI runs.
- **Requires modules** `account`, `orders`, and `payments` (declared in the `// requires-module` comment at the top).
- **Time is faked**: the "one hour later" step uses `cy.travel(61 * 60_000)` (a clock jump), not a real wait.
- **`failRefundsOf` with `null`** is the "provider lets it through" action; it does not itself complete the refund — the `cy.runJob('sweep-payment-effects')` call does.
- The test seeds a paid order via `cy.subjectId('order.paid')` rather than creating one inline.
- `timelineTypes` is **not exported**; it is file-local and intentionally minimal (only reads the `type` field).
