---
source: tests/e2e/specs/journeys/ac21-it-was-not-me.cy.ts
sha256: b1141264b870cf5f4797f38816a39c7efcde1fe17467bee3e545e0d37f2a7086
signature: f4ddea2c2b793fc3e703d4039ed4598cb3891ef7bff23780f5e9b9b1247f3814
generated_at: 2026-11-10T06:47:09.828053+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac21-it-was-not-me.cy.ts

## Purpose

E2E journey test for Acceptance Criterion 21: a thief with a stolen session changes the account's email address, and the old (legitimate) address can undo the change whether it is still pending or already confirmed. Verifies that only the newest undo link is valid, a spent link is dead, and undoing severs any session authenticated under the thief's address.

## Key elements

- **`requestChangeTo(address)`** – Navigates to `/en/profile`, types the new address, submits, and asserts the pending-change banner appears.
- **`newUndoLink(oldAddress, known)`** – Fetches the next notice email for the old address that is *not* already in `known`, and extracts its undo link.
- **`confirmLinkOf(address)`** – Fetches the verification email sent to the new address and returns its confirmation link.
- **`spendUndo(link)`** – Visits `/en` first (to force a full page load past the `#token=` fragment), then opens the undo link and clicks the undo button.
- **`spendConfirm(link)`** – Same fragment-workaround, then clicks the confirmation button.
- **Constants** – `FIRST`, `SECOND`, `THIEF` (test email addresses), `ONE_CHANGE_APART_MS` (61 s, the backend minimum between two change requests), `NOTICE` (email template name).
- **`describe` / `it` block** – A single test that walks the full scenario: request → notice → supersede → undo pending → confirm-undone fails → sign in as old address → confirm as thief → undo-after-confirm → thief session revoked → double-spend is inert.

## Relationships

- **`tests/support/e2e/harness.ts`** – Provides `loginDevice`, `refreshDevice` (401 check on the thief's token), and `requestAsDevice` (API call to verify session liveness).
- **`tests/support/e2e/commands.ts`** – Supplies `byTemplate` (email filter by template), `expectMailTemplate` (assertion), and `mailedLinkUrl` (extracts the URL from an email).
- **`tests/support/e2e/security-steps.ts`** – Provides `letTimePass` (waits the one-minute gap the backend enforces), `loginDeviceWith` (logs in under the thief address), and `submitLoginForm` (UI login as the original user).
- **`tests/support/e2e/steps.ts`** – Provides `carriesAnotherLink`, used by `newUndoLink` to exclude already-seen undo links from the mailbox query.
- **`scripts/e2e/mail-message.ts`** – Provides `mailMentions`, used to assert the notice email names the new address.

## Notes

- **Fragment-URL gotcha:** `spendUndo`/`spendConfirm` must `cy.visit('/en')` before `cy.visit(link)` because consecutive undo/confirm links share the same path and differ only in a `#token=` hash; a same-path navigation with a new hash does not trigger a full page reload in the browser.
- **Mailbox dependency:** The test calls `cy.skipUnlessMailbox()` and will be skipped in environments without a mail-capture service.
- **Timing:** `letTimePass(ONE_CHANGE_APART_MS)` (61 s) is required between two change requests; the backend rejects closer intervals with `EMAIL_CHANGE_TOO_SOON`. A live run actually waits this long.
- **Out of scope:** The seven-day undo-link expiry and the freed-address race are deliberately *not* covered here; they are pinned by backend integration tests. Jumping a week in time would also invalidate every session on the test shard.
- **`beforeEach`** restores state via `cy.restore()` (from `harness.ts`) and re-visits `/en` to clear any SPA route state between runs.
