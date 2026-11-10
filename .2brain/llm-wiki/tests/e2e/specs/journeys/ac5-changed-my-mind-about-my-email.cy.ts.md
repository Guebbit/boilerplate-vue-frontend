---
source: tests/e2e/specs/journeys/ac5-changed-my-mind-about-my-email.cy.ts
sha256: 5a754a7e70ca7cb5af3ed394633f581766b64e3d3d44cfb2724889e9c4db4671
signature: b603d0c8e5ea2eeac00f6c7b9e810fb183b2d3cdaeb6eafd24e45a42702fd156
generated_at: 2026-11-10T06:48:46.570424+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac5-changed-my-mind-about-my-email.cy.ts

## Purpose

End-to-end journey test for Acceptance Criterion 5 ("I changed my mind about my new email"). It verifies the full lifecycle of a pending email-address change that is never confirmed: resending the link (and invalidating the previous one), canceling the change (killing all outstanding links), the old address remaining usable, and rejection of an address already held by another account. The test seeds the pending state via the `pendingEmail` persona rather than typing through the change request.

## Key elements

- **`ADDRESS_PATTERN`** – Regex used to extract the pending email address from the notice text in the DOM.
- **`PAST_THE_COOLDOWN_MS` (61 000)** – Server cooldown duration plus 1 s margin; used with `cy.travel` in the demo profile.
- **`COUNTDOWN_TIMEOUT_MS` (70 000)** – Max wait for the resend button to re-enable in a live backend.
- **`NOTICE_SUBJECT`** – Subject string ("Your email address is changing") used to filter the mailbox for change notices.
- **`RESEND`** – `[data-test=pending-email-resend]` selector for the resend button.
- **`pastTheCooldown()`** – Advances the demo clock (or waits on the button in live mode) so the resend cooldown expires; the page is reloaded to reset the browser-side countdown.
- **`noticesSent()`** – Returns a `Cypress.Chainable<number>` of how many change-notice emails are in the mailbox.
- **`pressResend()`** – Asserts the resend button is enabled, then clicks it.
- **`confirmFromLink(link)`** – Visits a mailed confirmation URL and clicks the confirm submit button.
- **`describe` / single `it` block** – One long test walking through: notice extraction → resend → cooldown UI → 429 on in-cooldown press → link invalidation on second resend → cancel → old-address sign-in → taken-address rejection.

## Relationships

- **`tests/support/e2e/commands.ts`** – Source of `expectMailTemplate` (asserts the received email matches the expected template) and `mailedLinkUrl` (extracts the confirmation URL from the email body). Both are used to verify the mail was sent and to obtain the link for later confirmation steps.
- **`tests/support/e2e/steps.ts`** – Source of `carriesAnotherLink`, a predicate used as a filter on the second resend mail to confirm it contains a different confirmation token than the first, proving the old link was superseded.

## Notes

- The test is gated behind `cy.skipUnlessMailbox()`; it will be skipped in CI profiles without a mailbox.
- `pastTheCooldown` branches on `liveProfile`: the demo profile uses `cy.travel` (a virtual-clock helper) plus a page reload; the live profile simply waits for the button to re-enable, which doubles as an assertion that the countdown is driven by the server's `retryAfter`.
- The 429-in-cooldown scenario is triggered by reloading the page (which resets the browser countdown) and then pressing resend immediately; the test asserts the error text is present and does **not** contain the literal "Too Many" (the backend returns a friendly message).
- The single `it` block covers five distinct scenarios sequentially; a failure mid-test means later steps are not executed.
- `cy.restore()` in `beforeEach` resets the seeded persona state between runs.
