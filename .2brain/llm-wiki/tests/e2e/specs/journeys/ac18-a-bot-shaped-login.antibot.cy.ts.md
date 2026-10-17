---
source: tests/e2e/specs/journeys/ac18-a-bot-shaped-login.antibot.cy.ts
sha256: fbad1dc1d8882f4a38d3cab3e053f051b28ce89def727d1a8311e5a0807c3b56
generated_at: 2026-10-17T02:05:40.435114+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac18-a-bot-shaped-login.antibot.cy.ts

## Purpose

E2E journey test for AC18: verifies that the anti-bot "human check" (Altcha) is introduced on the login form only after the account's failure budget is half-spent (3 wrong passwords out of a budget of 6), while password-reset and signup requests require the check from the very first submission and are rejected (401) without its token. Runs exclusively in the **antibot shard**.

## Key elements

- **`OWNER`** – Mutable `{ email, password }` pair populated at test start from the seeded `secondShopper` account via `cy.accountOf('secondShopper')`.
- **`NEWCOMER`** – Fixed signup identity with a `Date.now()`-suffixed email to guarantee uniqueness across runs.
- **`attemptLogin(password)`** – Helper that fills the login form with `OWNER.email` + the given password and submits, without asserting navigation away.
- **`describe` / `it` block** – A single test covering the full story: two silent misses → check appears on third miss → solve → correct password logs in → reset rejected without token → reset accepted with token → signup rejected without token → signup accepted with token.

## Relationships

- **`tests/support/e2e/steps.ts`** – Provides the two imported helpers:
  - `solveHumanCheck()` – Completes the Altcha widget (clicking the verify button / polling for the token) so the subsequent form submission carries a valid check.
  - `fillSignupForm(email, password)` – Populates the signup form fields (used in the signup portion of this test).

## Notes

- **Shard gating:** The comment header and `requires-module` directive indicate this file is meant to run only in the antibot shard, where `scripts/e2e/antibot-backend.ts` pins the per-account login budget to 6. Running it against a different backend would change the threshold at which the check appears.
- **Account isolation:** The `secondShopper` seed is used because no other antibot journey signs in as that address; failure counts are per-address, so sharing an account would leak state between tests.
- **`beforeEach` pattern:** Visits `/en`, calls `cy.restore()`, then visits `/en` again — a project convention for resetting session/state before each test.
- **Altcha test attribute:** The human-check element is located via `[data-test=human-check-altcha]`; its *absence* is asserted after the first two wrong logins and its *presence* after the third.
- **401 vs 2xx:** Reset and signup are first submitted *without* the token and expected to return HTTP 401; after `solveHumanCheck()` the same submission is expected to return 200–299. This is the explicit "refuse without token" contract under test.
