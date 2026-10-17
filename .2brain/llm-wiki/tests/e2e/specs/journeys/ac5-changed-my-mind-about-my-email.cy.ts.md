---
source: tests/e2e/specs/journeys/ac5-changed-my-mind-about-my-email.cy.ts
sha256: 71cbd8fb1d1d846761a4a0a84facd97cb0d5479b671bb4cff513e2b38641f0af
generated_at: 2026-10-17T02:06:37.803350+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac5-changed-my-mind-about-my-email.cy.ts

## Purpose

E2E journey test for Acceptance Criteria 5: a user who requested an email-address change (but has not yet confirmed) can **resend** the confirmation link (old link is invalidated), **cancel** the change (all links die, original address restored), or discover the desired address is **taken by another account**. It exercises the full pending-email lifecycle from the `pendingEmail` persona in a single integration test.

## Key elements

- **`pastTheCooldown()`** — Waits past the 60 s resend cooldown. In the demo profile it calls `cy.travel(61_000)` and reloads; in a live profile it waits up to 70 s for the button to become enabled.
- **`noticesSent()`** — Queries the virtual mailbox for the count of emails with subject *"Your email address is changing"* (regardless of recipient).
- **`pressResend()`** — Asserts the resend button is enabled, then clicks it.
- **`confirmFromLink(link)`** — Visits the supplied confirmation URL and clicks the confirm submit button.
- **`ADDRESS_PATTERN`** — Regex extracted from the pending-email notice text to recover the new address under test without hard-coding it.
- **`describe('AC5 · …')` → single `it(…)`** — One long, step-narrated integration test covering: resend mails only the new address (old is not re-notified), the cooldown button disables + shows a countdown, a press inside the cooldown is refused in plain words, a fresh link supersedes the first, cancel invalidates the newest link, the original address still signs in, and a taken address is refused without parking a notice.

## Relationships

- **`tests/support/e2e/commands.ts`** — Imports `expectMailTemplate` (asserts a received email matches a given template name) and `mailedLinkUrl` (extracts the confirmation URL from a mail body).
- **`tests/support/e2e/steps.ts`** — Imports `carriesAnotherLink`, a predicate passed to `cy.emailTo` that filters the mailbox for the email containing a *different* link (i.e., the replacement, not the original).

## Notes

- **Demo vs. live backend:** The `liveProfile` env flag (read via `cy.env`) selects the cooldown strategy. Demo backends expose a movable clock (`cy.travel`); live backends require waiting out the real countdown on the UI button. The test asserts the button text changes to `"Resend in …"` in both cases.
- **`cy.skipUnlessMailbox()`** guards the entire test: without a virtual-mailbox backend the mail assertions cannot run.
- **`beforeEach`** calls `cy.restore()` between visits to reset seeded account state; the `pendingEmail` persona is assumed to already have a pending change (seeded, not typed).
- The test is deliberately a **single `it` block** with `cy.step` narrative rather than multiple tests, because each step depends on the prior one's side effects (mailed links, parked state, cooldown).
- `COUNTDOWN_TIMEOUT_MS` (70 s) intentionally exceeds `PAST_THE_COOLDOWN_MS` (61 s) to give the live countdown a safe margin.
