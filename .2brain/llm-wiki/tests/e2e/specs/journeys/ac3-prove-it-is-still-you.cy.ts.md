---
source: tests/e2e/specs/journeys/ac3-prove-it-is-still-you.cy.ts
sha256: a89aee930808811c39e8a51100f845a8876f3823721f045bbdf6913833cafaf1
signature: 9cdfe296e10ccb49c7c318308dd2cf9a5af83bf48b691189f783ff8216b3f057
generated_at: 2026-11-10T06:48:12.395441+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac3-prove-it-is-still-you.cy.ts

## Purpose

E2E journey test for AC3 ("Prove it's still you"): verifies that when the re-authentication window lapses, both checkout and data export trigger a password re-auth dialog rather than failing outright, that a wrong password is rejected with an in-dialog error, that cancel abandons the action with a human-readable API error, and that the correct password resumes the original action. Uses demo-mode time travel (`cy.travel`) to simulate elapsed time.

## Key elements

- **`PAST_CRITICAL_MS`** (400 000 ms) — point past the 300 s critical window but still inside the 600 s access-token lifetime.
- **`PAST_SENSITIVE_MS`** (1 000 000 ms) — point past the 900 s sensitive window; the access token has also expired, so a refresh precedes the re-auth.
- **`answerDialog(password)`** — types a password into the open re-auth dialog and submits it.
- **`answerWithCustomerPassword()`** — fetches the test user's password via `cy.accountOf('user')` and delegates to `answerDialog`.
- **`describe('AC3 · Prove it's still you', …)`** — single `@smoke`-tagged test that walks through: cart → critical-window lapse → checkout 401 → dialog → wrong pw → cancel → correct pw → 201 order; then sensitive-window lapse → token refresh → export 401 → dialog → cancel → correct pw → 202 accepted.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides `addToCartFromStorefront`, the single imported helper used to populate the cart before the re-auth scenario begins.

## Notes

- **Demo-only:** `cy.skipUnlessDemo()` guards the test; the `cy.travel` command (and the `NODE_REAUTH_TIME_CRITICAL` / `NODE_REAUTH_TIME_SENSITIVE` constants) exist only in the demo backend.
- **Module requires header:** the leading `// requires-module:` comment lists the backend modules (`account`, `cart`, `delivery`, `inventory`, `orders`, `payments`, `products`) that must be loaded for the test to run.
- **Error-message assertions deliberately avoid raw HTTP words** (e.g., "Unauthorized", "Unprocessable Entity") to enforce that the UI shows the API's own message, not a generic label.
- **`beforeEach` visits `/en` twice** (with a `cy.restore()` in between) to seed the session before each step.
- The export sub-scenario runs at `PAST_SENSITIVE_MS`, which is *past* the token lifetime (600 s), so the backend must refresh the token before issuing the re-auth challenge; the test asserts this implicitly by visiting `/en/profile` first.
