---
source: tests/e2e/specs/journeys/ac17-copied-session-cookie.cy.ts
sha256: a5fbae5dc69daad6cec5e34d9b45e68bd30d67e3ec8c4f4c3107523c463292fa
signature: 0fc0cda69ff5d1513f0d360e25fbb0b62e70535cab07165df48b8fd10cf122f0
generated_at: 2026-11-10T06:46:09.600689+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac17-copied-session-cookie.cy.ts

## Purpose

E2E journey test for acceptance criterion 17: a stolen session cookie must be refused after rotation and logout. It verifies two invariants — (1) in `jwt` mode, replaying a pre-rotation cookie past the grace window returns 401 and revokes all sessions for the account; (2) in both modes, a cookie copied before logout refreshes nothing once the server has logged the user out.

## Key elements

- **`PAST_GRACE_MS`** (11 000 ms) — constant just beyond the backend's 10 s `NODE_TOKEN_ROTATION_GRACE_MS` window.
- **`thiefWith(cookieValue)`** — builds a `Device` object carrying only the copied `__Host-session` cookie (no token), simulating an attacker's Node request.
- **`refreshCookieValue()`** — reads the current `__Host-session` cookie value from the browser; asserts the cookie exists.
- **`loginRememberingMe()`** — signs in via `/en/login` with the "remember me" checkbox forced-checked so the refresh cookie persists across browser sessions.
- **Test 1: "an old cookie replayed after the grace window is refused and revokes every session"** — `jwt`-mode only; copies the cookie, triggers a rotation via reload, advances the clock past the grace window, replays the stale cookie expecting 401, then asserts the current tab is also logged out.
- **Test 2: "logging out kills the session on the server, so a copied cookie refreshes nothing"** — mode-agnostic; copies the cookie, logs out, then replays the cookie expecting 401.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `refreshDevice` (performs the actual Node-side refresh request), `skipUnlessSessionMode` (gates the jwt-only test), and the `Device` type used by `thiefWith`.
- **`tests/support/e2e/security-steps.ts`** — provides `letTimePass`, which advances the demo backend's clock (or waits in real time on the live profile) to push past the rotation grace window.

## Notes

- The jwt-mode test uses a **regular `function` declaration** (not an arrow) specifically so Mocha's `this.skip()` works inside `skipUnlessSessionMode`. Do not convert it.
- `loginRememberingMe` uses `check({ force: true })` on the remember-me checkbox; the element may not be fully visible at the moment of interaction.
- The file header declares `requires-module: account`, meaning the `account` backend module must be enabled for these tests to run.
- On the **live profile** (cross-origin `:8085` → `:3000`), `letTimePass` performs a real wait rather than a clock manipulation, so that test takes ≥ 11 s wall-clock time.
