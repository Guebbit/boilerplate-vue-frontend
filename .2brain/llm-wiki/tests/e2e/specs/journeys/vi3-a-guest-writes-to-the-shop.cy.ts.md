---
source: tests/e2e/specs/journeys/vi3-a-guest-writes-to-the-shop.cy.ts
sha256: 7fd605037de84dc2acf1ff09f881114156ced707eef51d83015550c5c3fe6129
generated_at: 2026-10-17T02:22:57.114541+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/vi3-a-guest-writes-to-the-shop.cy.ts

## Purpose

Cypress end-to-end journey test (VI3) that verifies the full guest contact-form experience on the Italian site: successful submission without a name, operator mail in the shop's language (not the guest's), silent drop of honeypot/spam submissions, and the per-address rate-limit budget (5 messages) that refuses the sixth with a localized error while preserving the user's typed content.

## Key elements

- **`SENDER`** — Fixed email (`vi3.guest@example.com`) so per-address and per-email budgets are consumed together.
- **`BUDGET`** (5) — Number of accepted messages before the limiter kicks in.
- **`TOO_MANY`** — The 429 error envelope the backend returns when the budget is exhausted; includes the Italian sentence used in assertions.
- **`TicketLike`** — Minimal shape for admin-search results (`subject`, `status`, `name?`).
- **`writeToTheShop(subject, extra?)`** — Fills and submits the contact form; leaves the name field empty; optionally types into the hidden honeypot field (`[data-test=contact-website]`) to simulate a bot.
- **`ticketsAbout(subject)`** — Queries the admin feedback search API and returns the matching tickets.
- **`describe` / `it` block** — Single test with four `cy.step` sections: (1) guest submits from `/it/contact`, (2) operator mail is in shop language, (3) honeypot submission is marked spam and no mail is sent, (4) sixth submission hits the rate limit.

## Relationships

- **`scripts/e2e/mail-message.ts`** — Provides `mailMentions`, a helper that checks whether a mail body contains a given string. Used to assert the operator mail is in English ("New contact request") and *not* in Italian ("Nuova richiesta"), and to confirm sender address and message body appear.

## Notes

- **Demo vs. live backend:** When `cy.env(['liveProfile'])` is not `true`, the 429 response for the sixth message is stubbed with `cy.intercept` because the demo backend raises all budgets to 100 000. On a real profile the backend naturally enforces the budget of 5.
- **Mail ordering trick for the bot step:** A third (honest) message is sent *after* the bot's; the test waits for the third's mail to arrive, then asserts the bot's subject is absent from `cy.sentSubjects()`. Because mail is sent FIFO, the bot's (earlier) would already have arrived if it existed.
- **Form-persistence on rate-limit:** After the 429, the test asserts the subject input still holds the typed text (the form is *not* cleared on failure), distinguishing it from the success path where the form empties.
- **`requires-module: feedback`** comment at the top indicates this spec depends on the `feedback` module being present in the backend.
- The honeypot field is targeted with `{ force: true }` because it is hidden from real users.
