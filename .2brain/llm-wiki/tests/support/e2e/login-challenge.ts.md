---
source: tests/support/e2e/login-challenge.ts
sha256: 9b6efbba4c04e07b56161c2b344aa0d3aa6d03dbbdd21870aefe893b077c531e
signature: 8b758d54c4d03df42c1c60bb821d98785ab5692e465ef053b8c651c5e8a5e67b
generated_at: 2026-11-10T07:33:33.058105+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/login-challenge.ts

## Purpose

Provides a single reusable Cypress helper that programmatically solves the two-factor (TOTP) challenge page so e2e journey specs don't each have to duplicate that logic.

## Key elements

- **`answerChallengePage(totpSecret: string)`** — the sole export. Asserts the challenge page is present, calls the `loginTotpCode` Cypress task (passing the base32 secret and the `apiUrl` env var) to obtain a one-time code, types that code into the `[data-test=two-factor-challenge-code] input`, and clicks `[data-test=two-factor-challenge-submit]`.

## Relationships

- **`tests/support/e2e/commands.ts`** — the only other support-layer neighbor; this file invokes `cy.task('loginTotpCode', …)` at runtime, and both files sit in the shared e2e support directory.
- **Journey specs** (`at11-a-staff-member-walks-away.cy.ts`, `fr20-my-staff-session-idled-out.cy.ts`, `fr23-a-busy-staff-session-still-ends.cy.ts`, `fr9-a-link-i-was-sent.cy.ts`, `op11-a-moderator-bans-a-customer.cy.ts`) and **`src/modules/account/tests/e2e/auth.cy.ts`** — the consuming side of the dependency graph; each imports `answerChallengePage` to complete the TOTP step in their test flow.

## Notes

- The function reads `apiUrl` from `cy.env` at call time, so the Cypress config must define that env variable; a missing value will pass `undefined` (coerced to `"undefined"`) into the task payload.
- The code is generated per-call via a Node task, not computed in the browser — the actual TOTP derivation lives in the Cypress server-side task.
- `cy.get('#two-factor-challenge-page').should('exist')` is a synchronous-ish assertion; if the page hasn't rendered yet the call will fail rather than wait.
