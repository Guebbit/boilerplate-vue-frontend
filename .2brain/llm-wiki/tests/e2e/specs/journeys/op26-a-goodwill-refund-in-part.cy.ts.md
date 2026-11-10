---
source: tests/e2e/specs/journeys/op26-a-goodwill-refund-in-part.cy.ts
sha256: 14b0bcf3efb3405331b63af78cde6912da1b504d2eaa758a1b2fb68facb6392f
signature: 88891446ce34078fad08948986cf02d1b36981fe6b689188d80888298c8cd7de
generated_at: 2026-11-10T07:15:09.905450+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op26-a-goodwill-refund-in-part.cy.ts

## Purpose

E2E journey test for OP26: verifying the admin's partial-refund flow from the order edit page. It exercises client-side validation (zero, negative, sub-cent), server-side rejection (over-refund), idempotency under a double-click, the partial→full refund lifecycle, and the customer-facing aftermath (mail, credit notes, payment status).

## Key elements

- **`GOODWILL`** – constant `5`, the partial-refund amount used in the happy-path step.
- **`PaymentLike`** – local interface narrowing the shape of a payment object the test reads (`amount`, `amountRefunded`, `displayStatus`, `refunds[]`). Used as the generic on `paymentOfOrder`.
- **`describe('OP26 · A goodwill refund, in part')`** – single suite; `beforeEach` visits `/en`, restores state, revisits.
- **Single `it` block** – broken into sequential `cy.step` sections:
  1. Zero / negative input → field error + disabled button.
  2. `0.001` → server error, no state change.
  3. `total + 1` → server "more than is left" error, no state change.
  4. Double-click on `5.00` → exactly **one** refund, payment `partially_refunded`, order stays `paid`.
  5. Customer receives mail + one credit note.
  6. Second refund (remaining balance) → payment `refunded`, button disabled.
  7. Customer view shows `Refunded` status and two credit-note rows.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides `paymentOfOrder` (fetch a payment by order), `eventually` (poll until a predicate passes), `orderMailTo` (assert a mail was sent to a user for an order), and `creditNotesOf` (fetch credit notes visible to a user for an order). All four are imported and used throughout the single `it` block.

## Notes

- The test relies on `cy.restore()` in `beforeEach` for state isolation; the order is the seeded `order.paid` (no card budget spent).
- The refund button is triggered via `dblclick` in the idempotency step—intentional, to prove the server/client enforces single-refund semantics.
- After the second (remaining) refund, the test does **not** re-type an amount; it clears the input and clicks the button, implying the UI defaults to the full remaining balance.
- `eventually` is used wherever async state changes are expected (refund landing, payment status flip) rather than fixed `cy.wait` calls.
