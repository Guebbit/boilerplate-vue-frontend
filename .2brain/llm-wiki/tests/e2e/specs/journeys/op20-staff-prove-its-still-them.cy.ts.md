---
source: tests/e2e/specs/journeys/op20-staff-prove-its-still-them.cy.ts
sha256: b7fe191791e7da603558d898ae8a4f21dcad2310508c10115fda1f5c8928be03
signature: 7027af1fcd112413fac80549bb94caabe2372879645b47a53c73f17c121cdd57
generated_at: 2026-11-10T07:13:49.569576+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op20-staff-prove-its-still-them.cy.ts

## Purpose

End-to-end journey test (Cypress) verifying that irreversible staff actions (refund, forced status override, receiving a returned parcel, hard-deleting an account) trigger a re-authentication password dialog when the sign-in is older than the critical window (300 s), while ordinary actions (start, ship, deliver) never do. It also asserts the dialog's interaction contract: a wrong password keeps the dialog open, cancel writes nothing, and the correct password carries the action through exactly once.

## Key elements

- **`PAST_CRITICAL_MS`** (400 000 ms) — the clock offset used by `cy.travel()`: past the 300 s re-auth threshold but inside the 600 s access-token lifetime.
- **`REASON`** — the text typed into the override-reason textarea for the forced-status step.
- **`OrderLike` / `PaymentLike` / `ReturnLike`** — minimal typed slices (status, amount/amountRefunded, status) used for API assertions.
- **`answerDialog(password)`** — types a password into `[data-test=reauth-dialog-password]` and clicks submit.
- **`answerAs(role)`** — fetches the real password for a role (`admin`, `warehouse`, `moderator`) via `cy.accountOf` and calls `answerDialog`.
- **`wrongThenCancel()`** — asserts the dialog is visible, submits a wrong password (verifies validation error + dialog persists), clicks cancel, and asserts the dialog is gone.
- **`describe` → single `it`** — one long journey covering five sub-steps: refund, forced status, ordinary delivery, return receive, account erasure. Each "asks" step follows the pattern *trigger → wrongThenCancel → verify nothing changed → trigger again → answerAs → verify it landed exactly once*.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides `eventually` (poll-until-true helper), `shipTheOpenGroup` (ships the open shipping group in one call), and `paymentOfOrder` (fetches the payment tied to an order).
- **`tests/support/e2e/harness.ts`** — provides `loginDevice` (returns a device session object for a role) and `requestAsDevice` (makes an API call with that device's credentials; used to confirm the 404 after account erasure).

## Notes

- **Demo-only**: the test calls `cy.skipUnlessDemo()` and relies on `cy.travel()` to move the demo backend's clock; it will not pass against a production or non-demo backend.
- **Module gate**: the `requires-module` header comment lists `account, delivery, orders, payments, returns, users`; the test assumes all five are loaded.
- **State reset**: `beforeEach` visits `/en`, calls `cy.restore()`, then re-visits — every assertion depends on a clean fixture state.
- **Race after re-auth**: the action (refund, status change, return close) is not synchronous with the dialog closing; the test uses `eventually` to poll until the side-effect is visible.
- **Ordinary-delivery step ordering**: the order is first started (no re-auth), then shipped via `shipTheOpenGroup`, then delivered — the comment notes an override can never leave `pending`, so the ordinary path is exercised here rather than in the forced-status step.
