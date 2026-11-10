---
source: tests/e2e/specs/journeys/fr8-session-expired-while-typing.cy.ts
sha256: e094c3a8d93c6df2c83a8bb98fbc6f6afcf0853a5914d0e2d1288358013d7f51
signature: e094c3a8d93c6df2c83a8bb98fbc6f6afcf0853a5914d0e2d1288358013d7f51
generated_at: 2026-11-10T07:08:01.217308+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr8-session-expired-while-typing.cy.ts

## Purpose

Cypress e2e journey test verifying that a customer who is mid-way through filling the address form does **not** lose their input when the access token expires. In JWT mode the client must transparently refresh the token and replay the save (401 → refresh → 201); in cookie mode the save simply succeeds (201) with no refresh call. The test confirms no login redirect and no "session expired" message appear.

## Key elements

- **`PAST_ACCESS_TOKEN_MS`** (`610_000`) — milliseconds to time-travel past the 600 s access-token TTL but within the 7-day refresh-token TTL. Passed to `cy.travel()`.
- **`STREET`** (`'Via Lenta 12'`) — the street value typed into the form and later asserted as saved.
- **`describe('FR8 · …')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` to reset demo state.
- **`it('a form left open … still saves …')`** — the single scenario. Skipped unless running in demo (`cy.skipUnlessDemo()`). Drives the UI to fill all address fields, time-travels, intercepts the two relevant endpoints, clicks save, and asserts the correct status-code sequence based on `cy.env('sessionMode')`.

## Relationships

No external file dependencies are recorded in the dependency graph. The test exercises the `account` module's HTTP endpoints (`POST …/account/addresses`, `POST …/account/refresh`) purely through network interception, so it couples to the backend API contract rather than to local source files.

## Notes

- **Demo-only:** `cy.skipUnlessDemo()` gates the whole test; it relies on the demo backend's clock being controllable via `cy.travel()`.
- **Session-mode branching:** assertions differ at runtime based on the `sessionMode` environment variable (`jwt` vs `cookie`). There is no separate test per mode — both paths live in one `it` block.
- **Interception order (JWT):** the test expects the *first* `@save` to be a 401, a single `@refresh` to return 200, and the *second* `@save` to return 201. In cookie mode `@refresh.all` must be empty.
- **UI selectors** are `data-test` attributes throughout; the country picker uses a Vuetify overlay (`.v-overlay-container` / `.v-list-item`).
- The file header comment `// requires-module: account` signals that the test is only meaningful when the account feature module is present.
