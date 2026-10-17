---
source: tests/e2e/specs/journeys/n2-withdraw-after-delivery.cy.ts
sha256: c3cca9cb638cfedccf06f6d5d784e471c869cd403ae54a3fbd27008c2213fc91
generated_at: 2026-10-17T02:18:23.476311+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/n2-withdraw-after-delivery.cy.ts

## Purpose

End-to-end test for journey **N2 — Withdraw after delivery**. Verifies the full customer-rights flow: a delivered order is still inside the withdrawal window, the customer exercises the right (double-click confirm), a return is auto-created as `approved`, the warehouse receives the goods with a handling-damage deduction, the refund equals *paid − deduction* (checked in cents), the payment reports a partial refund, a credit note is issued, inventory is restocked, and the customer sees the closed state with an email notification.

## Key elements

- **`DEDUCTION_CENTS = 300`** — Hardcoded warehouse handling deduction (€3.00) used to assert the refund arithmetic.
- **`PaymentLike` / `ReturnLike` / `CreditNoteLike`** — Minimal typed slices of API responses this spec reads (amount, status, refunded amount, reason, grand total).
- **`beforeEach`** — Visits `/en`, calls `cy.restore()` (re-seeds fixtures), visits `/en` again to clear stale state.
- **`describe('N2 · Withdraw after delivery')` → single `it`** — The entire journey in one test, sequenced with `cy.step` breadcrumbs:
  1. Verify withdrawal panel is visible, no return yet.
  2. Read paid amount from the payments API.
  3. Double-click confirm (first click only opens the dialog).
  4. Assert return exists with `status: 'approved'`, `reason: 'withdrawal'`.
  5. Switch to warehouse, type the deduction, receive the goods.
  6. Assert on-screen refund = `paid.cents − DEDUCTION_CENTS`.
  7. Assert return status flips to `closed`.
  8. Verify inventory movement row says "Restock" and links back to this order.
  9. Poll payment API until `amountRefunded > 0`; assert exact cents and that `displayStatus ≠ 'refunded'`.
  10. Poll credit-notes endpoint; expect exactly one.
  11. Switch back to customer; assert UI shows closed return, partial-refund badge, credit-note row, and that the order number appears in the inbox email.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `centsOf` (reads a currency display into integer cents), `eventually` (retries an assertion until it passes), `idFromLocation` (extracts the order ID from the URL), and `orderNumberShown` (reads the human-facing order number from the page).
- **`scripts/e2e/mail-message.ts`** — Imports `mailMentions`, used to assert the inbox email contains the order number.

## Notes

- **Seeded subject**: The test depends on a pre-seeded order identified by `cy.subjectId('order.withdrawal-open')` — delivered ~1 day ago so it is inside *any* withdrawal window the deployment may configure (14–30 days). It is explicitly *not* the `order.delivered` subject, which is weeks old and outside the window.
- **Required modules** (comment header): `account`, `delivery`, `inventory`, `orders`, `payments`, `returns`. All six must be present in the environment.
- **Cents-level assertion**: Refund equality is checked in integer cents (`Math.round(amount * 100)`), not in the formatted display string, to catch rounding or forgotten delivery-charge bugs.
- **Deduction is hardcoded** to 300 cents and typed into the warehouse form as `3.00`; if the UI or API changes the default deduction, the test will fail on the arithmetic assertion.
- **Async assertions** on the payment refund and credit note use the `eventually` helper (polls with retries) because the refund is processed asynchronously after the warehouse "receives" the goods.
- **The return is born `approved`** — the test asserts the warehouse UI has no approve/decline controls, only the "receive with deduction" form. This encodes the legal constraint that a withdrawal is a right, not a discretionary return.
