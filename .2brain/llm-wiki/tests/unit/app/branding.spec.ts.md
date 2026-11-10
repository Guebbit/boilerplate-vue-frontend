---
source: tests/unit/app/branding.spec.ts
sha256: ad8a7c3e44be2ec8ac175445518efbe6cef112b0bc069aa07d25a0d2f282a11c
signature: ad8a7c3e44be2ec8ac175445518efbe6cef112b0bc069aa07d25a0d2f282a11c
generated_at: 2026-11-10T07:44:24.530411+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/branding.spec.ts

## Purpose

Vitest spec that locks down the two brand-override knobs a derived project changes (`brandName` and `brandLogoSource`). It verifies the resolution priority (runtime config → build-time env → hardcoded default) and that logo paths are correctly resolved against the app's base path, including edge-case URL formats.

## Key elements

- **`describe('brandName')`** — three cases for `brandName()`:
  - Returns the hardcoded default `"Guebbit"` when nothing is set.
  - Prefers `__APP_CONFIG.APP_NAME` (runtime) over `VITE_APP_NAME` (build-time).
  - Falls back to `VITE_APP_NAME` when no runtime config exists.
- **`describe('brandLogoSource')`** — four cases for `brandLogoSource(base)`:
  - Serves the bundled logo (`/images/guebbit-logo-colored.png`) under the given base when no logo is configured.
  - Resolves a configured `VITE_APP_LOGO` path against the base, normalising leading slashes.
  - `it.each` pass-through: absolute `https://`, protocol-relative `//`, and `data:` URIs are returned unchanged.

## Relationships

- No graph neighbors.

## Notes

- Mocking strategy: `vi.stubEnv` for Vite env vars, `vi.stubGlobal('__APP_CONFIG', …)` for runtime config. Tests do **not** call `vi.unstubAllEnvs()` / `vi.unstubAllGlobals()` in a `beforeEach`/`afterEach`—rely on Vitest's automatic unstubbing between tests.
- The `brandLogoSource` signature takes `base` as an argument (not read from a module-level constant), so each call is pure and easy to assert.
- The `it.each` tuple includes a `data:` URI to guard against a naïve `startsWith('/')` check incorrectly rewriting non-HTTP sources.
