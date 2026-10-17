---
source: tests/unit/infrastructure/blank-build-environment.spec.ts
sha256: 7ed4c51a6870fa39e660967c8cd99c427ba4b27c1f9c6b64448a304e25af253e
generated_at: 2026-10-17T02:34:18.910294+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/blank-build-environment.spec.ts

## Purpose

Verifies that a blank (empty-string) `VITE_*` value in `.env` is treated as "not set" by every module that reads build variables at module scope. The tests exist because `??` would let `''` through, producing `NaN` timeouts, blank locales, and blank glyphs; the codebase uses `||` instead, and this spec pins that behavior.

## Key elements

- **`loadWith<T>(environment, load)`** — resets all Vitest modules, stubs the given env vars via `vi.stubEnv`, then re-runs the import so module-scope reads execute fresh.
- **`afterEach`** — calls `vi.unstubAllEnvs()` and deletes `globalThis.__APP_CONFIG` to prevent cross-test leakage.
- **Test: axios timeout / base URL** — asserts `client.ts` yields `timeout: 10000` and `baseURL: ''` when `VITE_AXIOS_TIMEOUT` and `VITE_API_URL` are `''`.
- **Test: empty-value glyph** — asserts `formatters.EMPTY_VALUE` is `'—'` (em dash) when `VITE_APP_EMPTY_VALUE` is `''`.
- **Test: default & fallback locale** — asserts `i18n.global.locale.value` and `fallbackLocale.value` are both `'en'` when the two locale vars are blank.
- **Test: locale app** — asserts `localeApp()` returns `'demo-fe'` when `VITE_LOCALE_APP` is blank.

## Relationships

No graph neighbors are recorded for this file. It is a leaf test that imports production modules (`@/infrastructure/http/client.ts`, `@/infrastructure/utils/formatters.ts`, `@/i18n`, `@/infrastructure/locale-overrides.ts`) solely through dynamic `import()` to trigger fresh module evaluation.

## Notes

- The file relies on `vi.resetModules()` + re-import to re-execute module-scope `||` reads; a plain static import would not re-run them.
- The `afterEach` also removes `globalThis.__APP_CONFIG`, implying at least one of the tested modules caches its config on `globalThis` rather than a plain module-level `const`.
- The file is marked `@module` in its docblock to suppress ESLint's "no-empty-module" or similar lint rules for a top-level side-effect-free spec.
