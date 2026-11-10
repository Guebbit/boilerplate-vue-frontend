---
source: tests/unit/infrastructure/blank-build-environment.spec.ts
sha256: 44e2a321142a4ac1ff80503ed095cb194da4f2c4cba1b7bcbb7dca59b039f698
signature: 9036df3d2be8799aa9a0c3a1afac1b21402b585fd0de04b65e3f8b679c4ed5d7
generated_at: 2026-11-10T07:54:26.329240+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/blank-build-environment.spec.ts

## Purpose

Guarantees that a `VITE_*` variable left blank (empty string) in `.env` is treated as "not set" by every consumer that reads build-time configuration. The underlying modules use `||` rather than `??` so an empty string falls through to the hardcoded default; this spec locks that behavior in by re-importing each affected module with the variable stubbed to `''` and asserting the default still takes effect.

## Key elements

- **`loadWith<T>(environment, load)`** – Test helper that calls `vi.resetModules()`, stubs the given env vars via `vi.stubEnv`, then performs a fresh dynamic `import()`. Ensures module-scope reads (which capture the environment once at load time) execute again under the stubbed values.
- **`afterEach` hook** – Deletes `globalThis.__APP_CONFIG` so i18n module state doesn't leak between tests.
- **`describe('a blank build variable is treated as unset')`** – Four cases:
  - `VITE_AXIOS_TIMEOUT: ''` / `VITE_API_URL: ''` → axios instance keeps `timeout = 10_000` and `baseURL = ''`.
  - `VITE_APP_EMPTY_VALUE: ''` → `formatters.EMPTY_VALUE` is the em-dash `—`.
  - `VITE_APP_DEFAULT_LOCALE: ''` / `VITE_APP_FALLBACK_LOCALE: ''` → i18n locale and fallback remain `'en'`.
  - `VITE_LOCALE_APP: ''` → `localeApp()` returns `'demo-fe'`.

## Relationships

- **`tests/cross-cutting/module-map.spec.ts`** – Cross-cutting spec that enumerates/validates the project's module map; this file is one of the entries it checks for correct placement or naming conventions. No import relationship; the connection is purely at the registry level.
- **`scripts/lighthouse/evaluate.ts`** – No direct import or reference in this file. Listed as a graph neighbor; no shared code or interaction is visible from this file's content.

## Notes

- The entire test relies on **`vi.resetModules()` + fresh dynamic import**. If a module under test caches its config at top level, the import order and module-cache reset are critical — a plain `import` at the top of the file would capture the real env and the test would be meaningless.
- The `afterEach` cleanup targets `globalThis.__APP_CONFIG` specifically because the i18n module (`@/i18n`) writes to it. Omitting this cleanup causes cross-test pollution when running the full suite.
- The file's module-level doc comment documents the **`||` vs `??` convention** across the codebase for `VITE_*` reads. If a future contributor switches a consumer to `??`, this spec will fail — it acts as a guard for that convention.
