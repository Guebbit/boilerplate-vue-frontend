---
source: tests/e2e/specs/journeys/cu24-prove-you-are-human.antibot.cy.ts
sha256: 84a38c429f93fe969b4f88c70adad092a83e4f603ebebae89308ebe7bb46cad3
generated_at: 2026-10-17T02:11:55.430188+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu24-prove-you-are-human.antibot.cy.ts

## Purpose

End-to-end test for user story CU24 ("Prove you are human"). Verifies that the anti-bot human-check (altcha) widget appears **only after a payment decline** for a logged-in customer's retry, while a **guest contact form shows the check from the start** and refuses submission without a valid token. Runs exclusively in the antibot shard where the backend boots the altcha provider at low cost.

## Key elements

- **`TicketLike`** — minimal interface (`{ subject: string }`) for the admin inbox API response.
- **`ticketsAbout(subject)`** — calls the admin `POST /feedback/search` endpoint and returns the matching tickets; used to assert whether a ticket was actually created.
- **`writeToTheShop(subject)`** — fills the contact form (email, subject, message) and clicks submit, without interacting with the human-check widget.
- **`describe / beforeEach`** — visits `/en`, calls `cy.restore()` to reset DB state, re-visits.
- **Single `it` block** — walks through four narrative steps:
  1. First card attempt is declined **without** the check appearing.
  2. Second payment attempt triggers the check widget; order stays `pending`.
  3. `solveHumanCheck()` + re-submit → order becomes `paid`, widget disappears.
  4. Guest contact form: check is present immediately; submit without token → `ANTIBOT_VERIFICATION_FAILED` error, no ticket; after `solveHumanCheck()` the same submit succeeds and one ticket exists.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports three helpers:
  - `addToCartFromStorefront('product.rich')` — adds the seeded product to the cart.
  - `idFromLocation()` — extracts the order ID from the URL after checkout.
  - `solveHumanCheck()` — programmatically solves the altcha widget and fills its hidden token field.
- The file header references **`scripts/e2e/antibot-backend.ts`** as the backend entry point that boots the altcha provider at low cost (doc-only, no import).
- The `requires-module` comment lists the backend modules this test depends on: `account, cart, delivery, feedback, inventory, orders, payments, products`.

## Notes

- The `.antibot.cy.ts` suffix scopes execution to the antibot shard; this spec **will not run** in the default e2e suite.
- The `cy.restore()` call in `beforeEach` resets the test database; the test then re-visits the page so UI state is clean.
- The test asserts both UI state (widget presence, error visibility, button enabled/disabled) **and** API state (order `status` field, ticket count) to catch silent backend bugs.
- `writeToTheShop` intentionally does **not** call `solveHumanCheck`; the "refused" step relies on the token being absent, so calling it inside that helper would break the negative assertion.
