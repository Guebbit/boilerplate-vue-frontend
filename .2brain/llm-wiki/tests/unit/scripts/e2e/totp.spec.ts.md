---
source: tests/unit/scripts/e2e/totp.spec.ts
sha256: b61abc28cc2f3ec4f109c9959f49b70f80126d6c9c26196a6ced994d1025bd33
generated_at: 2026-10-17T02:43:53.869157+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/totp.spec.ts

## Purpose

Unit tests for the `totpCode` helper used by e2e journeys. Verifies that the six-digit code it mints is well-formed, matches RFC 6238 known-answer vectors, advances correctly with `stepsFromNow`, and round-trips through the same `otplib` `verify` call the backend uses.

## Key elements

- **`SECRET`** – RFC 6238 appendix-B base32 secret (ASCII `"12345678901234567890"`). Used as a fixed known-answer input so tests are deterministic.
- **`describe('totpCode')`** – four `it` blocks:
  - *six digits* – regex `^\d{6}$` check on the default (step 0) output.
  - *RFC 6238 vector* – pins the output to `'287082'` at T = 59 s (SHA-1, 6-digit truncation of `94287082`).
  - *step advance* – asserts `stepsFromNow: 1` produces a code different from `stepsFromNow: 0` at the same timestamp.
  - *otplib round-trip* – mints a code at a large epoch, asserts the exact value `'081804'`, then confirms `otplib.verify` accepts it.

## Relationships

- **`scripts/e2e/totp.ts`** – sole production dependency; exports `totpCode({ secret, stepsFromNow }, timestampMs?)` which this spec exercises. The e2e journey scripts call `totpCode` to type an authenticator prompt; this spec guards that helper.
- **`otplib` (external)** – `verify` is used as an independent oracle to prove the minted code is valid per the standard, closing the loop between generation and verification.

## Notes

- The test lives under `tests/unit/…` despite testing an e2e helper — it is a fast, deterministic unit test (no browser, no server) that keeps the e2e suite's TOTP path in CI without spinning up a full journey.
- `totpCode` accepts the timestamp in **milliseconds**; `otplib.verify` accepts `epoch` in **seconds**. The round-trip test converts between the two (`1_111_111_109_000` → `1_111_111_109`).
- `stepsFromNow` is a 30-second-window offset, not an arbitrary seconds offset.
