---
source: tests/e2e/specs/journeys/vi3-a-guest-writes-to-the-shop.cy.ts
sha256: 92efe5b74747a3dcf63d54c2cb256b5e0e44d95668efee17bf0d6077b32d3fd7
signature: f2edd67321468244edf25c81b04574406b0ab63ea1d453bfba9066725e729887
generated_at: 2026-11-10T07:22:41.884323+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/vi3-a-guest-writes-to-the-shop.cy.ts

## Purpose

E2E journey test that walks a guest (no account) through the shop's contact form on the **Italian** site and verifies four behaviors in one scenario: the form clears after a successful send; the operator's notification mail is written in the shop's default language (English) regardless of the sender's language; a bot filling the hidden honeypot is acknowledged but never mailed; and the sixth message from the same address hits the rate limit, is refused with a human-readable error, and leaves the typed input intact.

## Key elements

- **`SENDER`** – Fixed guest address (`vi3.guest@example.com`) so per-address and per-email budgets are spent together.
- **`BUDGET`** – Set to `5`; the sixth submission is the one that must be refused.
- **`TOO_MANY`** – A 429 `rejectEnvelope` stub (`RATE_LIMITED`, Italian message) used to simulate the rate-limit response when the live profile's budget is artificially high.
- **`TaskLike`** – Minimal interface (`subject`, `status`, `name?`) describing the task rows the admin search API returns.
- **`writeToTheShop(subject, extra?)`** – Fills email, subject, message; optionally types a honeypot value with `{ force: true }`; clicks submit.
- **`tasksAbout(subject)`** – Calls `POST /tasks/search` as the admin role and returns the matching task items.
- **`describe` / `it`** – Single test case that sequences all four assertions using `cy.step` markers.

## Relationships

- **`scripts/e2e/mail-message.ts`** – Imports `mailMentions`, a helper that checks whether a given string appears in a captured mail body. Used to assert the operator's mail language and content.
- **`tests/support/e2e/envelope.ts`** – Imports `rejectEnvelope` to construct the 429 `RATE_LIMITED` problem envelope that is injected as a stub on non-live profiles.
- **`tests/support/problem-stub.ts`** – Graph neighbor; not directly imported by this file (likely a transitive dependency of `envelope.ts`).

## Notes

- The file header declares `// requires-module: tasks`; the test will fail or be skipped if the `tasks` module isn't loaded in the backend.
- `beforeEach` calls `cy.skipUnlessMailbox()` — the whole suite is skipped when no mailbox fixture is available.
- The honeypot input is hidden, so it is typed with `{ force: true }`; a real visitor never reaches it.
- On the **demo** profile the backend raises all budgets to 100 000, so the 6th-message refusal cannot occur naturally. The test detects `liveProfile !== true` and stubs the POST with `TOO_MANY`.
- Verifying the bot was *not* mailed is done indirectly: a third (honest) message is sent after the bot, then `cy.sentSubjects()` confirms no subject containing the bot's run-id appears.
- Several custom Cypress commands are used and are not standard: `cy.textareaIn`, `cy.emailAbout`, `cy.sentSubjects`, `cy.apiAs`, `cy.skipUnlessMailbox`, `cy.restore`.
