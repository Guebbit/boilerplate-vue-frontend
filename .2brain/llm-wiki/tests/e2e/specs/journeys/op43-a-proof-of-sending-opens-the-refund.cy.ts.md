---
source: tests/e2e/specs/journeys/op43-a-proof-of-sending-opens-the-refund.cy.ts
sha256: dbcd5f610a46833c726be23d8754f4456344b32409b9d8a5313bfde6e6e628ad
signature: bd16c835ff4e10b447370986db20418be5a2a1647b50eb1633c8056d970b295f
generated_at: 2026-11-10T07:19:27.346802+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op43-a-proof-of-sending-opens-the-refund.cy.ts

## Purpose

End-to-end Cypress journey test for OP43: a customer withdraws from a delivered order, the warehouse records the carrier's proof of sending, and that action opens the refund. The test verifies the full lifecycle — proof recorded once (second attempt → 409), cancel no longer available, the refund sits in "Needs attention" with its legal deadline, and a sweep job eventually processes it once the simulated provider unblocks it.

## Key elements

- **`PROOF`** – Fixed carrier (`Poste Italiane`) and tracking reference used in the UI form and API assertions.
- **`sentOn()`** – Returns today minus two days as `YYYY-MM-DD`; the "receipt date" typed into the form.
- **`PaymentLike` / `ReturnLike`** – Minimal typed slices of the API responses the test reads (`amountRefunded`, `status`, `proofCarrier`, `actions.*`, etc.).
- **`describe('OP43 · …')` / single `it`** – One long happy-path + guard test. `beforeEach` gates on demo mode, resets DB, and re-visits `/en`.
- **Step sequence inside the test** – (1) customer withdraws; (2) warehouse sees the proof form; (3) empty submission rejected client-side; (4) valid proof recorded; (5) UI shows proof, no re-record form, no cancel form; (6) API confirms `actions.recordProof === false`, `actions.cancel === false`; (7) duplicate POST → `409 RETURN_PROOF_ALREADY_RECORDED`; (8) time-travel 61 min, "Needs attention" row shows legal deadline; (9) provider unblocked, `sweep-payment-effects` runs, refund amount matches the quoted `refundAmount`.

## Relationships

- **`tests/support/e2e/harness.ts`** – Supplies `failRefundsOf(orderId, error|null)` to toggle the fake payment provider's refusal state, and `loginDevice(role)` to obtain an authenticated device token for direct API assertions.
- **`tests/support/e2e/steps.ts`** – Supplies `eventually(poller, predicate)` for retry-until-true polling, `paymentOfOrder(role, orderId)` to fetch the payment record, and `refusedWith(device, method, path, body, status, code)` to assert a specific error response.

## Notes

- **Demo-only**: `cy.skipUnlessDemo()` means this test never runs against production seeds.
- **Simulated refusal**: The card-network refusal is a lever on the fake provider (`failRefundsOf`), not a real PSP integration.
- **Time manipulation**: The "hour" wait is a `cy.travel(61 * 60_000)` clock jump, not real elapsed time.
- **Legal reference**: The "Needs attention" rule text ("Legal refund deadline (withdrawal)") corresponds to Directive 2011/83/EU Art. 13(3); the test asserts that string appears in the UI.
- **Idempotency guard**: The 409 check uses a *separate* device (`loginDevice`) to confirm the conflict is server-side, not session-bound.
- **Amount assertion**: The final check compares `payment.amountRefunded` to `return.refundAmount` (the amount quoted at proof-recording time) in whole cents, confirming no deduction is applied.
