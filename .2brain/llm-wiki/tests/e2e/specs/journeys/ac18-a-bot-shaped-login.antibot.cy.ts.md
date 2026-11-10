---
source: tests/e2e/specs/journeys/ac18-a-bot-shaped-login.antibot.cy.ts
sha256: a55da7de199c516b0ccae7c295f57b6507d4aeca9d739e218527ef465ba296eb
signature: e861ccb3c3e2c455d3dd5632e05d956e7069414f616f86a19f18e0d46c66939e
generated_at: 2026-11-10T06:46:20.738014+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac18-a-bot-shaped-login.antibot.cy.ts

## Purpose

E2E journey test for AC18: verifies that the human-check (Altcha) widget appears at the correct threshold during login (only after the account's failure budget is half-spent), and that password-reset and signup requests require the check token from the very first submission. Runs exclusively in the **antibot** shard, where the backend pins the per-account login budget at 6.

## Key elements

- **`OWNER`** – Mutable object holding the seeded *secondShopper* account credentials; populated at test start via `cy.accountOf('secondShopper')`.
- **`NEWCOMER`** – Pre-built signup identity with a timestamp-suffixed email to guarantee uniqueness across runs.
- **`attemptLogin(password)`** – Fills the login form (email + password) and submits without asserting navigation; used repeatedly to simulate sequential wrong/correct attempts.
- **`beforeEach`** – Visits `/en`, calls `cy.restore()` (seed reset), and re-visits `/en` to start each test from a clean session.
- **Single `it` block** – Walks the full story: 3 wrong logins (no check) → 4th wrong login (check appears) → solve check + correct login → reset request refused (403) → solved → accepted (2xx) → signup refused (403) → solved → account created.

## Relationships

- **`tests/support/e2e/steps.ts`** – Imports `solveHumanCheck` (interacts with the Altcha widget and submits) and `fillSignupForm` (populates the signup fields). Both are called mid-journey to satisfy or skip the human-check gate.

## Notes

- **Shard-gated.** The `antibot` shard backend (`scripts/e2e/antibot-backend.ts`) sets the failure budget to 6; the test relies on that exact number (check appears on the 4th attempt). Running it against a default backend would change the threshold.
- **Account isolation.** The secondShopper account is intentionally *not* used by any other antibot journey. Failure counts are per-email-address, so sharing it would pollute other tests' budgets.
- **No admin-created account.** Because the admin UI no longer supports password-at-creation, the test must use the seeded customer rather than creating a throwaway one.
- **`OWNER` is mutated asynchronously.** The `email`/`password` fields are empty at module load and filled inside the first `cy.step` via a `.then()` callback; `attemptLogin` reads them at call time, so ordering matters.
- **403 vs 2xx assertions.** Reset and signup submit *before* solving the check to prove the server rejects a missing token (403), then solve and re-submit to confirm acceptance (2xx range). This two-step pattern is repeated for both endpoints.
