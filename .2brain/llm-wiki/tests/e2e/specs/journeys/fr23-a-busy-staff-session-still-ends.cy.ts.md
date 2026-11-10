---
source: tests/e2e/specs/journeys/fr23-a-busy-staff-session-still-ends.cy.ts
sha256: 0b340d8334b6da5ead8a8fb5b1e558b499d70fd630f0b18e200313e0d479ef84
signature: 0db0874c90e1af65d453d10886c8b852f25f644eb0eb99d728cbbfecb5174042
generated_at: 2026-11-10T07:06:55.369512+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr23-a-busy-staff-session-still-ends.cy.ts

## Purpose

Cypress e2e journey test for FR23: verifies that a staff (editor) session is terminated by the 24-hour absolute cap even when the user stays active (never idles), and that the resulting login page remembers the page the editor was on. Also confirms a shopper session has no such cap and persists past 24 hours.

## Key elements

- **`MINUTE_MS`, `HOP_MINUTES`, `HOPS_INSIDE_THE_CAP`** — Constants tuning the "busy" loop: 53 hops × 27 min ≈ 23 h 51 min, keeping the editor just under the 24 h cap while staying inside both the 30-min idle limit and the 28.5-min page countdown.
- **`IDLE_CODE`** (`'SESSION_IDLE'`) — The error code the test asserts does *not* appear, proving the cap (not the idle rule) ended the session.
- **`signInRemembering(role)`** — Signs in via the login form with "remember me" checked; for staff (`totpSecret` present) it resolves the TOTP challenge via `answerChallengePage`.
- **`stayBusy(editPath)`** — Simulates activity without a full reload: navigates to `/en/products`, presses Back to the edit page, and waits for the authenticated price read to populate. Avoids renderer crashes that repeated `cy.reload()` causes.
- **Test 1** (`ends the editor 24 hours…`) — Signs in as editor, runs the 53-hop busy loop with `cy.travelEverywhere`, then reloads past the cap and asserts `#login-page` appears with a `continue=` redirect. Intercepts account API responses to collect error codes and asserts `SESSION_IDLE` is absent.
- **Test 2** (`does not end a shopper session…`) — Signs in as user, fast-forwards 25 h, reloads, and asserts the session is still alive.

## Relationships

- **`tests/support/e2e/login-challenge.ts`** — Imports `answerChallengePage`, which reads a TOTP secret and fills the one-time-code field on the login challenge screen. Called only when the seeded staff account has a `totpSecret`.

## Notes

- Both tests are gated by `cy.skipUnlessDemo()`; they only run in the demo environment.
- Test callbacks use the `function` keyword (not arrow) so Mocha's `this.skip()` is available.
- The file header comment `// requires-module: account, products` indicates it depends on those feature modules being enabled.
- Time is advanced with `cy.travelEverywhere` (a custom plugin command) rather than real waiting; the comment notes both server and client clocks move together.
- The deliberate choice to navigate + Back instead of `cy.reload()` is documented inline: repeated reloads cause renderer crashes or uncaught-error hangs roughly every other run.
