---
source: scripts/e2e/totp.ts
sha256: 070f32220f99a64a09d6158a646781f4eea7ecd7313c86f80f1d5cf294f68cc9
signature: 8888c38cdc3d5a674d23b2b7e043e417ee99b7340250eb48650f6fceea2c28f4
generated_at: 2026-11-10T02:37:39.757294+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/totp.ts

## Purpose

Generates RFC 6238 TOTP codes in the Cypress Node process so e2e journeys can enrol an authenticator and then sign in with it, without bundling a crypto library into the browser. Pure Node (no Cypress import) so the unit suite can exercise it without a browser.

## Key elements

- **`TotpRequest`** — interface: `secret` (base32) + `stepsFromNow` (how many 30 s steps ahead to mint).
- **`totpCode(request, now?)`** — returns a 6-digit code for `secret` at `now + stepsFromNow * 30 s`. The entry point for the Node-process task.
- **`loginTotpCode(secret, now?, sleep?)`** — returns the earliest unused, backend-acceptable step for `secret`, tracking per-secret replay marks in `lastLoginStep`. If both acceptable steps (current, current+1) are spent, it sleeps until the next window opens and retries.
- **`forgetLoginCodes(seededAt?)`** — clears `lastLoginStep`. If called with a timestamp (live reseed), also sets `seededThrough` so the reseed's own consumed step is never re-minted. Omit the argument for a demo-restore reset.
- **`loginTotpCodeFor(secret, apiUrl)`** — fetches `GET /__test/clock` from the demo backend to compute clock skew, then delegates to `loginTotpCode` with a skew-adjusted clock. Falls back to local clock if the endpoint is unavailable.
- **`STEP_SECONDS`** (30), **`CLOCK_MARGIN_MS`** (1500) — module-private constants governing step size and the read-behind margin that accounts for request round-trip.

## Relationships

- **`cypress.config.ts`** — imports this module so the code can run in the Cypress Node process (as the file's own header comment states).
- **`scripts/e2e/device-session.ts`** — e2e journey helper that calls `loginTotpCode` / `totpCode` to drive device enrolment and sign-in steps.
- **`scripts/lighthouse/collect.ts`** — authenticated Lighthouse collection uses `loginTotpCodeFor` to obtain a valid code against the (possibly clock-shifted) demo backend.
- **`tests/support/e2e/admin-api-task.ts`** — imports this module's exports and calls them on the Node side of the test run.
- **`tests/unit/scripts/e2e/totp.spec.ts`** — unit tests for every exported function; injects fake `now` and `sleep` to avoid real waits.

## Notes

- **Replay protection is per-secret and in-memory.** The `lastLoginStep` map lives only for the duration of a single Cypress Node process. A demo-restore wipes the backend's replay state, so `forgetLoginCodes()` must be called after a restore to avoid a spurious wait.
- **Clock read-behind.** `loginTotpCode` subtracts `CLOCK_MARGIN_MS` (1.5 s) from the local clock before computing the current step, because the backend's own clock reading is one request away. This is a heuristic, not a guarantee.
- **Demo vs. live clock.** `loginTotpCodeFor` exists specifically because the demo backend supports time-travel; a live backend shares the machine clock and the skew resolves to 0.
- **The `seededThrough` guard** ensures that after a *live* reseed (which does NOT reset the backend replay state), the step the seeder itself consumed is never re-minted.
- **Future-dated marks are discarded.** If a restore puts the clock back, a stored step ahead of `current + 1` is deleted rather than blocking progress.
- **Convention:** `now` is always in **milliseconds**; `otplib`'s `epoch` option is in **seconds** — the conversion (`Math.floor(now / 1000)`) happens at every call site.
