---
source: tests/e2e/specs/journeys/op20-staff-prove-its-still-them.cy.ts
sha256: 750f8988d6fbcddfbdbb01e08a0185981dd0cd3de0393944c59f206205fb84d1
generated_at: 2026-10-17T02:20:34.609899+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op20-staff-prove-its-still-them.cy.ts

## Purpose

End-to-end journey for **OP20** (re-authentication on irreversible staff actions). Verifies that once a session is older than the critical window (300 s), destructive actions—refunds, manual status overrides, forced delivery, return receipt, hard-deleting a user—prompt a password dialog mid-action, while ordinary actions (start, ship) never do. Confirms the dialog's three paths: wrong password keeps it open, cancel writes nothing, correct password carries the action forward exactly once. Demo-only; time is advanced via the backend's clock.

## Key elements

- **`PAST_CRITICAL_MS`** (400 000) — the time-travel offset: past the 300 s re-auth window but inside the 600 s access-token lifetime.
- **`REASON`** — the fixed justification string typed into forced-move textareas.
- **`OrderLike` / `PaymentLike` / `ReturnLike`** — minimal response shapes for API assertions (status, amount/amountRefunded, status).
- **`answerDialog(password)`** — types into the re-auth password field and clicks submit.
- **`answerAs(role)`** — resolves the role's real password from `cy.accountOf()` and delegates to `answerDialog`.
- **`wrongThenCancel()`** — asserts dialog is visible, submits a bad password, asserts the error message appears and dialog persists, then clicks cancel and asserts it disappears.
- **Single `it` block** — walks six scenarios in sequence: ordinary start (no dialog), refund, forced status override, forced delivery, warehouse return receipt, moderator hard-delete. Each "asks" scenario uses `wrongThenCancel` then retries with the correct password and polls the API via `eventually`.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `eventually` (poll-until predicate helper used after each successful re-auth to confirm the server-side effect landed) and `shipTheOpenGroup` (ships the current order's parcel group; used in the forced-delivery step so the order reaches a shippable state without triggering re-auth).
- **`tests/support/e2e/harness.ts`** — imports `loginDevice` (logs in a role and returns its device token for raw API calls) and `requestAsDevice` (issues an authenticated HTTP request with that device token; used for API assertions and the final 404 check on the erased user).

## Notes

- **Demo-only gate**: the entire test body is behind `cy.skipUnlessDemo()`; it relies on `cy.travel()` to manipulate the demo backend's clock and on `cy.restore()` / `cy.visit` in `beforeEach` to reset state.
- **Polling after re-auth**: the correct-password path closes the dialog before the mutation actually lands, so every "success" assertion is wrapped in `eventually(…)` rather than a single `cy.apiAs` call.
- **One `it`, many steps**: all six scenarios run in a single test to share one login session; `cy.travel` is re-called between scenarios to re-age the session.
- **`requires-module` directive** at the top declares this spec depends on six backend modules (account, delivery, orders, payments, returns, users) being present in the test environment.
- The forced-delivery step first ships the order via `shipTheOpenGroup` (an ordinary action that never asks) so that the only re-auth trigger under test is the "force delivered" toggle.
