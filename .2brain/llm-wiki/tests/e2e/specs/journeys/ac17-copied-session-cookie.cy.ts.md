---
source: tests/e2e/specs/journeys/ac17-copied-session-cookie.cy.ts
sha256: a5fbae5dc69daad6cec5e34d9b45e68bd30d67e3ec8c4f4c3107523c463292fa
generated_at: 2026-10-17T02:05:29.952061+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac17-copied-session-cookie.cy.ts

## Purpose

Cypress e2e spec for acceptance criterion AC17: a stolen (copied) `__Host-session` refresh cookie must be refused after the rotation grace window, revoking every session of the account. A second case verifies that server-side logout invalidates the session so a previously copied cookie can no longer refresh. The "thief" is simulated as a bare Node HTTP request carrying only the copied cookie value.

## Key elements

- **`PAST_GRACE_MS`** (11 000 ms) — constant just past the backend's 10 s `NODE_TOKEN_ROTATION_GRACE_MS` window.
- **`thiefWith(cookieValue)`** — builds a minimal `Device` object (empty `token`, cookie-only auth, resolved `apiUrl`/`mode`) to hand to `refreshDevice`, simulating a replay attempt.
- **`refreshCookieValue()`** — reads and returns the current `__Host-session` cookie value from the browser; fails if the cookie is absent.
- **`loginRememberingMe()`** — signs in via the login form with the "remember me" checkbox ticked so the refresh cookie persists across browser sessions.
- **Test 1** (`jwt` mode only): login → capture cookie → reload (triggers rotation) → confirm new cookie differs → `letTimePass(PAST_GRACE_MS)` → `refreshDevice` with old cookie expects `401` → verify the tab is now redirected to `/login`.
- **Test 2** (both modes): login → capture cookie → `cy.logout()` → `refreshDevice` with old cookie expects `401`.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `refreshDevice` (performs the Node-side refresh request), `skipUnlessSessionMode` (gates the first test to `jwt` mode), and the `Device` type used by `thiefWith`.
- **`tests/support/e2e/security-steps.ts`** — provides `letTimePass(ms)`, which advances the demo backend's clock past the grace window (or waits in real time on the live profile).

## Notes

- The first test is declared as a regular `function` (not arrow) so that Mocha's `this.skip()` inside `skipUnlessSessionMode` works; arrow functions would break `this`.
- In `cookie` session mode the session ID never rotates, so the "old copy replayed" scenario is meaningless — hence the mode guard.
- On the live profile the `__Host-session` cookie is cross-origin (`:8085` → `:3000`); `letTimePass` handles real waiting in that context versus clock-shifting in the demo backend.
- `beforeEach` calls `cy.visit('/en')` then `cy.restore()` to reset any prior session state before each test.
