---
source: tests/e2e/specs/journeys/fr8-session-expired-while-typing.cy.ts
sha256: 599c2a9f9738172f2c20d5d85dfa76fc4ef1f1b571466e15a78f322e32e753bf
generated_at: 2026-10-17T02:16:42.395811+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr8-session-expired-while-typing.cy.ts

## Purpose

End-to-end journey test for **FR8**: a user fills in the address form, the access token lapses mid-session, and the save still succeeds because the client silently refreshes the token and replays the original request. The test asserts the exact HTTP sequence (401 → refresh 200 → replay 201) and confirms no data was lost and no login screen appeared. It is a demo-only scenario, gated to `jwt` session mode.

## Key elements

- **`PAST_ACCESS_TOKEN_MS`** (610 000 ms) – Clock offset that pushes the demo backend past the 600 s access-token lifetime but well within the 7-day refresh-token window. Passed to `cy.travel()`.
- **`STREET`** (`'Via Lenta 12'`) – The street value typed into the form and later asserted as present in the saved address list.
- **`describe` / `it` block** – Single test case. The `it` uses a regular `function` (not arrow) so Mocha's `this.skip()` is available to `skipUnlessSessionMode`.
- **`skipUnlessSessionMode(this, 'jwt')`** – Skips the test when the active session mode is not `jwt` (cookie sessions have no access token to lapse).
- **`cy.skipUnlessDemo()`** – Skips unless running against the demo backend (required for `cy.travel` clock manipulation).
- **`cy.travel(PAST_ACCESS_TOKEN_MS)`** – Advances the demo backend clock to expire the access token.
- **`cy.intercept` calls** – Two intercepts (`@save`, `@refresh`) used to assert the 401 → 200 → 201 request sequence in order.

## Relationships

- **`tests/support/e2e/harness.ts`** – Imports `skipUnlessSessionMode`, which guards the test so it only runs under the `jwt` session mode. The harness also likely provides the `cy.skipUnlessDemo` / `cy.travel` / `cy.loginAs` / `cy.step` / `cy.restore` commands used throughout the spec.

## Notes

- **Demo-only**: Relies on `cy.travel()` to manipulate the backend clock; will not work against a production or non-demo API.
- **JWT-mode only**: The `skipUnlessSessionMode` guard means the test silently passes (is skipped) in `cookie` mode rather than failing.
- **Mocha `this` binding**: The `it` callback is intentionally a plain `function` (not an arrow) so that `this.skip()` works inside `skipUnlessSessionMode`.
- **`requires-module: account`** (top comment): This spec depends on the `account` module being available in the test environment.
- The test fills five text inputs by index and a country autocomplete (`Italy`), so it is coupled to the DOM structure of the address dialog (`data-test` attributes).
