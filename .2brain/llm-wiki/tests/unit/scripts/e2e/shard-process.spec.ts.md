---
source: tests/unit/scripts/e2e/shard-process.spec.ts
sha256: e7788348312c27fb3ddc85e569afc2af7547a7d5b65ec8a39851295f625cd5b6
signature: aa0b5844e100056c697d4fd6f993410fcc14884974b8b9f4f80f94902d9535df
generated_at: 2026-11-10T08:17:48.136778+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/shard-process.spec.ts

## Purpose

Unit tests for the `runWatched` watchdog from `scripts/e2e/shard-process.ts`, using `node -e <inline script>` as a stand-in for Cypress. Validates the three core behaviors: hanging process detection, liveness via continued output, and non-zero exit reporting.

## Key elements

- **`fakeCypress(code, quietMs)`** — helper that calls `runWatched(process.execPath, ['-e', code], …)` so tests can spawn a short-lived Node process with a controllable quiet window.
- **`describe('runWatched')`** — single describe block containing three specs:
  - *Hung process* — spawns `setInterval(…, 1000)` (no output), asserts `hung: true`, `signal: 'SIGKILL'`, and that the whole call finishes in < 10 s. Also feeds the result into `judgeShard` to confirm the verdict is `HUNG`.
  - *Lively process* — spawns a loop that logs every 100 ms, asserts `code: 0`, `hung: false`, and that output contains the last counter value.
  - *Non-zero exit* — spawns `process.exit(3)` with an error message, asserts `code: 3`, `hung: false`, and that output contains `"boom"`.

## Relationships

- **`scripts/e2e/shard-process.ts`** — the module under test; `runWatched` is the only import from it.
- **`scripts/e2e/shard-verdict.ts`** — `judgeShard` is imported and called once (in the hung-process spec) to verify that a killed result maps to a `HUNG` verdict with `ok: false`.

## Notes

- The "Cypress" in every comment is a metaphor; no real Cypress binary is invoked. The child process is always `node -e <JS>`.
- `quietMs` in `fakeCypress` is expressed in **milliseconds**, while `judgeShard` expects `quietMinutes` (a separate unit). Tests pass `10` for the latter purely to satisfy its type; it does not affect the watchdog timing.
- The hung test's 10 s ceiling (`toBeLessThan(10_000)`) is a safety net against the test itself hanging; the actual kill should occur around the 400 ms quiet window.
