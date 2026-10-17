---
source: tests/unit/infrastructure/runtime-config.spec.ts
sha256: bb99f252e817e05fb95ae5c49da7f2c52db4a5be1994329f647245e8084821ae
generated_at: 2026-10-17T02:38:31.433993+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/runtime-config.spec.ts

## Purpose

Unit tests for the `runtimeValue` helper in `@/infrastructure/runtime-config.ts`. They pin down the contract for how the app reads optional runtime configuration from `globalThis.__APP_CONFIG`, ensuring correct behavior in environments where `config.js` has never been injected (dev, unit tests, vite preview).

## Key elements

- **`afterEach` hook** — deletes `globalThis.__APP_CONFIG` after every test so cases don't leak into each other.
- **`describe('runtimeValue')`** — the single test suite; each `it` block asserts one behavioural contract:
  - Returns `undefined` when `__APP_CONFIG` was never set.
  - Returns the value the container placed under the requested key.
  - Trims leading/trailing whitespace from the stored value.
  - Treats a whitespace-only string identically to an unset key (returns `undefined`, never `''`).
  - Returns `undefined` for a key that is absent even when other keys are present.

## Relationships

- Imports `runtimeValue` from `src/infrastructure/runtime-config.ts` — the sole subject under test.
- Imports `describe`, `it`, `expect`, `afterEach` from `vitest`.
- No other graph neighbors.

## Notes

- **Blank ≠ empty.** The intentional "whitespace-only → `undefined`" behaviour is a deliberate contract (prevents an empty string from overriding a downstream default). Changing this would break the documented invariant.
- The test file references the source with an explicit `.ts` extension (`@/infrastructure/runtime-config.ts`), matching the project's ESM-style imports.
- All setup mutates `globalThis` directly; there is no mocking layer. If the implementation ever moves to a non-global lookup, these tests will need a different injection strategy.
