---
source: tests/unit/infrastructure/runtime-config.spec.ts
sha256: bf7905f47ea21f14ea6823027cb807361bd4bb33d73605032699b2fda2ecad43
signature: bf7905f47ea21f14ea6823027cb807361bd4bb33d73605032699b2fda2ecad43
generated_at: 2026-11-10T08:03:02.606246+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/runtime-config.spec.ts

## Purpose

Unit tests for the two exports of `src/infrastructure/runtime-config.ts` (`runtimeValue` and `readToursEnabled`), verifying how they read and normalize the `__APP_CONFIG` object that a server-side container injects into `globalThis` at runtime.

## Key elements

- **`afterEach` cleanup** — deletes `globalThis.__APP_CONFIG` so tests don't leak state into one another.
- **`describe('runtimeValue')`** — five cases covering:
  - Returns `undefined` when `__APP_CONFIG` was never assigned (the default dev/test/preview path).
  - Returns the value the container set for a given key.
  - Trims leading/trailing whitespace from the value.
  - Treats a whitespace-only string the same as a missing key (returns `undefined`, never `''`).
  - Returns `undefined` for a key that was never set, even if other keys exist.
- **`describe('readToursEnabled')`** — three cases covering:
  - Defaults to `true` when `TOURS_ENABLED` is absent.
  - Returns `false` only when the value is exactly the string `'false'`.
  - Returns `true` for any other value (e.g. `'true'`, garbage).

## Relationships

None (no graph neighbors recorded).

## Notes

- Tests simulate the container by writing directly to `globalThis.__APP_CONFIG`; they never import a real `config.js`. This mirrors the actual production contract: the key only exists if the server rendered it.
- The "blank string = unset" behavior is an explicit invariant tested here; if `runtimeValue` ever starts returning `''`, the UI's fallback logic breaks, so that case is intentionally called out in the test name.
- `readToursEnabled` uses a **whitelist-off** strategy (only the literal string `'false'` disables tours), not a standard boolean parse. The third test case ("stays on for any other value") guards against accidentally treating `'0'` or `''` as falsy.
