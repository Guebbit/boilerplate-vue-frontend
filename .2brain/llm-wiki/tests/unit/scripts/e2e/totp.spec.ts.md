---
source: tests/unit/scripts/e2e/totp.spec.ts
sha256: 27f322048bb1a46fded547e589f9d5e01aece1dd41b3d3438471b8687e1d28cb
signature: a022f8f6c98413008e123375639fe0f79d105c7f44bb6f909f17ef7d4e1bdd66
generated_at: 2026-11-10T08:18:48.957559+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/totp.spec.ts

## Purpose

Unit tests for the TOTP code-minting and login-code distribution logic in `scripts/e2e/totp.ts`. Validates that generated codes conform to RFC 6238, that the "earliest step first" consumption order works, that the module waits correctly when steps are exhausted, and that the API-clock variant (`loginTotpCodeFor`) handles both a live backend clock and its fallback path.

## Key elements

- **`SECRET`** – The RFC 6238 §B test secret (`GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`), used as a known vector throughout.
- **`describe('totpCode', …)`** – Asserts the output is six digits, matches the RFC 6238 SHA-1 vector at T=59 s (`287082`), that `stepsFromNow: 1` differs from `stepsFromNow: 0`, and that a minted code is accepted by `otplib.verify` at the correct epoch.
- **`noSleep`** – A `() => Promise.resolve()` stand-in injected as the sleep callback so tests run without real delays.
- **`describe('loginTotpCode', …)`** – Covers the sequential handout (current step then next), the "wait for the next 30 s window" path when both steps are spent, skipping a step already consumed by a live reseed (`forgetLoginCodes(AT)`), and resetting after `forgetLoginCodes()`.
- **`describe('loginTotpCodeFor', …)`** – Stubs global `fetch` to simulate a backend `/clock` endpoint; verifies the code is minted from the *served* clock, falls back to local `Date.now()` when the response is `ok: false`, and that a previously-spent step from a later clock is discarded when the clock is set back.

## Relationships

- **`scripts/e2e/totp.ts`** – The module under test. This spec imports `totpCode`, `loginTotpCode`, `loginTotpCodeFor`, and `forgetLoginCodes` directly from `../../../../scripts/e2e/totp` and exercises each one's contract.

## Notes

- Despite living under `tests/unit/…`, this is a *unit* test of a helper script, not a browser-based e2e test. The `e2e` in the path refers to the script's domain (e2e demo flows), not the test's execution model.
- The "both steps spent" test asserts `slept[0] > 24_000` (not exactly 25 s) because the clock is 5 s into a 30 s window; the remaining wait is 25 s but the assertion allows for rounding in the implementation.
- `forgetLoginCodes` is the test-reset hook for the module's internal "which step was last handed out" memory. Call it in `beforeEach`/`afterEach` or at the top of any test that depends on fresh state.
- The `loginTotpCodeFor` fallback test checks only the 6-digit shape, not a specific value, because the local clock is non-deterministic.
