---
source: tests/e2e/specs/journeys/cu31-it-arrived-broken.cy.ts
sha256: 9680cc56eea70df06a91e42832bf3a2128ba4ea1cff67ed28ac65db4d622b33c
signature: 71309898f3bff9552b8ad8045ffba936c973c4fe2e3ea313d0415611dbe6a102
generated_at: 2026-11-10T06:59:54.193878+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu31-it-arrived-broken.cy.ts

## Purpose

End-to-end Cypress journey test for CU31 ("It arrived broken"). It walks a two-line delivered order through a full multi-role return cycle — customer submits a defective-goods partial return, support approves, warehouse receives — then a second return of the remaining units as "wrong item" — verifying form validation, refund amounts (in cents, from the API), credit notes, and mail notifications at each step.

## Key elements

- **`inCents(amount)`** — local helper that converts a decimal amount string/number to integer cents (`Math.round(Number × 100)`). All money assertions use this.
- **`OrderLike`, `PaymentLike`, `ReturnLike`, `OptionsLike`** — narrow structural interfaces describing only the slices of API responses this test reads, used as generics for `cy.apiAs<…>`.
- **`describe('CU31 · It arrived broken')` / single `it(…)`** — one long test that sequences the entire journey via `cy.step(…)` blocks. Roles are switched with `cy.switchUser('support' | 'warehouse' | 'user')`.
- **`beforeEach`** — visits `/en`, calls `cy.restore()` (fixture reset), visits again.
- **Money assertions** — always compare `inCents(payment.amountRefunded)` against `inCents(order line price)` pulled from the API, never from DOM text.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the shared step helpers imported at the top:
  - `creditNotesOf` — fetches credit notes for an order as a given role.
  - `centsOf` — reads a `[data-test=…]` element and asserts its cent value.
  - `eventually` — polls an async API call until a predicate is satisfied (used for refund propagation).
  - `orderMailTo` — asserts a specific e-mail was sent to the customer for the order.
  - `paymentOfOrder` — fetches the payment record for an order as a given role.

## Notes

- **Money rule under test:** shipping is refunded *only* with the return that takes the last unit of the order; when the reason is `defective` or `wrong_item`, the full amount (shipping included) is refunded. The test asserts the first (partial) return refunds only goods cents, and the second (full) return refunds the entire paid amount.
- **Form validation is checked client-side:** empty submission and over-quantity are rejected without a `POST` — verified by intercepting `**/returns` and asserting zero requests.
- **Double-click guard:** the test explicitly `dblclick`s the submit button and asserts exactly one `201` response, guarding against duplicate submissions.
- **Role isolation:** support can see the return detail but not the "Return goods" form; the warehouse sees the receive form but not the approve button. The test asserts the *absence* of the other role's UI elements.
- **The file is truncated in the wiki source** — the test continues past the second-return payment assertion. Any downstream steps (e.g., final credit-note count, mail) should be read from the full file if further detail is needed.
