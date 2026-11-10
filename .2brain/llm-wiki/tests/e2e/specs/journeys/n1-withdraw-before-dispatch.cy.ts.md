---
source: tests/e2e/specs/journeys/n1-withdraw-before-dispatch.cy.ts
sha256: 32a0cd185eb6ea6afa6256182f9229d48290a00c791df0860ae5527b682d88be
signature: ae80f59934afa7a94eac5d6bbecb69ca4224f821a6a6a068edbec84af673b853
generated_at: 2026-11-10T07:10:42.796036+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/n1-withdraw-before-dispatch.cy.ts

## Purpose

End-to-end spec for journey **N1 · Withdraw before dispatch**: a customer who paid by card cancels the order while it is still in the shop (before dispatch). Verifies the EU Consumer Rights Directive Art. 11a flow — the withdrawal button asks twice, then the order is canceled, fully refunded (including delivery), stock is restored, a closed zero-line return is created, and an acknowledgement mail is sent.

## Key elements

- **`describe('N1 · Withdraw before dispatch')`** — tagged `@smoke`; `beforeEach` visits `/en`, runs `cy.restore()`, then visits `/en` again to reset state.
- **`PaymentLike` interface** — narrow shape the test reads from the payments API (`displayStatus`, `status`, `amount`, `amountRefunded`).
- **Test 1 — "asks twice, cancels…"** — Full happy-path: adds `product.barebones` to cart, checks out with standard shipping, pays, confirms the two-step withdrawal dialog, then asserts order status `canceled`, payment `refunded` for the full amount, a single closed return with reason `withdrawal` and zero lines, admin-side stock restored to pre-purchase level, and a mail mentioning the order number and the word "withdraw".
- **Test 2 — "withdraws from a mixed order whole…"** — Mixes `product.barebones` with `product.noWithdrawal` (made-to-order); asserts the button is still enabled and the whole order cancels.
- **Test 3 — "shows the button disabled…"** — Order contains only `product.noWithdrawal`; asserts the button is disabled, a `withdraw-blocked-reason` element explains why ("made to your specifications"), and a `withdraw-blocked-contact` element is present.

## Relationships

- **`tests/support/e2e/steps.ts`** — Primary helper source. Provides `addOpenProductToCart`, `cents`, `centsOf`, `eventually`, `idFromLocation`, `orderNumberShown`, `searchAndOpenProduct`, and `paymentOfOrder`. The `cents` / `centsOf` helpers (defined in `scripts/e2e/cents.ts` and re-exported here) convert displayed currency strings to integer cents for exact-amount assertions.
- **`scripts/e2e/mail-message.ts`** — Supplies `mailMentions`, used to assert the acknowledgement email body contains the order number and the word "withdraw".
- **`scripts/e2e/cents.ts`** — Underlying currency-parsing utility; reached indirectly through the `steps.ts` re-export of `cents`.

## Notes

- The file header declares `requires-module: account, cart, delivery, inventory, orders, payments, products, returns`, meaning all of those BE modules must be running for the spec to pass.
- Stock is read as **admin** (`cy.apiAs('admin', …)`) to bypass the customer-facing "In stock" flag and get the exact numeric count.
- Refund assertion uses the `eventually` polling helper because the refund is written by the payments module asynchronously after the cancel.
- The two-step confirmation (click → dialog → confirm) is intentional per Art. 11a; the first click must leave the order in `paid` status.
- The zero-line closed return is a deliberate BE convention: before dispatch there are no goods to ship back, so the return record exists for audit but carries no line items.
