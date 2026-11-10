---
source: tests/e2e/specs/journeys/fr6-too-many-attempts.cy.ts
sha256: 343a80b1c0763fa377f0fe49b6beaf7f3257a9e93005162a1cb7ef44277f9abf
signature: 7e12a2eaa509c41c1cebd71cf464971013c513767b9c465d87769e25854359ea
generated_at: 2026-11-10T07:07:36.955899+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr6-too-many-attempts.cy.ts

## Purpose

End-to-end spec for the FR6 requirement (rate-limiting on repeated wrong passwords). It verifies that when the backend returns a 429, the login form displays the rate-limit message instead of repeating "wrong password", stays on the login page with the email field preserved, and that the next correct attempt succeeds once the budget resets. The 429 is intentionally stubbed via `cy.intercept` so that a real budget is never consumed and does not leak into subsequent specs.

## Key elements

- **`RATE_LIMITED`** — Module-level constant. A 429 problem-details envelope (title, `RATE_LIMITED` error code, human-readable detail) built with `rejectEnvelope(429, 'RATE_LIMITED', …)`. Used as the stubbed response body.
- **`attemptLogin(email, password)`** — Local helper. Clears and types the email/password inputs, then submits the form. Returns `void`; callers assert on the result.
- **`describe('FR6 · Too many attempts', …)`** — Single `it` block that: (1) records the "wrong password" message, (2) intercepts the next `POST /account/login` to return `RATE_LIMITED` + `Retry-After: 60`, (3) asserts the error text changed, the URL and email field are unchanged, and (4) removes the intercept so the real backend handles a correct login.

## Relationships

- **`tests/support/e2e/envelope.ts`** — Direct import of `rejectEnvelope`, used to construct the `RATE_LIMITED` 429 response shape (headers, body) that matches what the real `express-rate-limit` middleware would emit.
- **`tests/support/problem-stub.ts`** — Listed as a graph neighbor (likely an underlying dependency of `envelope.ts` for the problem-details shape), but not imported directly in this file.

## Notes

- The top-of-file comment `// requires-module: account` signals that this spec depends on the `account` backend module being available in the test environment.
- `beforeEach` calls `cy.restore()` to reset application state before visiting `/en/login`; without this, a prior spec's session could interfere.
- The 429 stub is a **deliberate design choice**: the real budget is exercised by backend unit/integration tests. Stubbing here avoids cross-spec contamination on a shared live backend.
- The test reads the "wrong password" text on the first attempt and explicitly asserts that text is **not** present after the 429 — guarding against a regression where the form re-shows the stale error.
- The final "honest attempt" step removes the intercept (`request.continue()`) so the request hits the real backend, confirming the form still functions normally after a 429.
