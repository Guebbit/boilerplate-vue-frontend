---
source: scripts/e2e/totp.ts
sha256: 52e81dee1e36fefc9b3033f5f0be8d43a8356404b777bc6a89abe5e148125b06
generated_at: 2026-10-02T14:34:20.941338+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/totp.ts

## Purpose

Generates a valid TOTP code for a given base32 secret so that e2e (Cypress) journeys can enrol a TOTP factor and immediately sign in with it, without waiting 30 seconds or running a real authenticator app. Kept pure and outside `tests/support/e2e/` so the unit suite can exercise it without a browser.

## Key elements

- **`TotpRequest`** (interface) — input shape: `secret` (base32) and `stepsFromNow` (how many 30 s TOTP steps ahead of "now" to mint).
- **`totpCode(request, now?)`** (exported async function) — returns the six-digit TOTP code via `otplib`'s `generate`. Accepts an injectable `now` (ms) defaulting to `Date.now()` for deterministic unit testing.
- **`STEP_SECONDS`** (module constant, `30`) — the RFC 6238 period; used to convert `stepsFromNow` into a seconds offset on the epoch.

## Relationships

- **cypress.config.ts** — registers `totpCode` as a `cy.task('totpCode')`, making this module available to browser-side test code while the crypto work stays in the Node process.
- **tests/unit/scripts/e2e/totp.spec.ts** — imports `totpCode` and `TotpRequest` directly (no browser) to assert correct digits and step advancement.

## Notes

- `stepsFromNow` is the key ergonomic knob: pass `0` for the code that confirms a fresh enrolment, `≥ 1` for subsequent sign-ins. The backend rejects a replayed step, so bumping the step avoids a real 30 s sleep while still falling within the accepted one-step drift window.
- The same `otplib` major version as the backend is intentional; a version mismatch could change the algorithm defaults and produce codes the server won't accept.
- `now` is the second positional argument (not part of `TotpRequest`) so callers in Cypress never pass it, while the unit test can pin the clock.
