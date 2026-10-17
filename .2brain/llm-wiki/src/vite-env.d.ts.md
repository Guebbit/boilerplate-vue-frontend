---
source: src/vite-env.d.ts
sha256: 3564fed294de7e46aa89c2362edbc96baf2895b9d79a9af494a676d5af34b8e3
generated_at: 2026-10-17T01:58:58.141992+00:00
model: ollama:qwen3.8:27b
---

# src/vite-env.d.ts

## Purpose

Ambient type declaration that makes every `import.meta.env.VITE_*` key used in the app a compile-checked, typed property. Without this file, Vite falls back to `Record<string, any>` for undeclared keys, so a typo'd or missing env var would silently resolve to `any` instead of failing at build time.

## Key elements

- **`interface ViteTypeOptions`** — Sets `strictImportMetaEnv: unknown`, the flag that switches Vite's `ImportMetaEnv` from permissive (`any`) to strict (undeclared keys are compile errors).
- **`interface ImportMetaEnv`** — Module-augments Vite's built-in `ImportMetaEnv` (per Vite's own pattern) to declare every `VITE_*` key the app reads as `readonly` and optional (`?`). All values are typed `string | undefined` because Vite only injects strings and an unset `.env` entry is `undefined` at runtime.
- **Declared keys** (22 total): `VITE_API_SSE`, `VITE_API_URL`, `VITE_APP_DEFAULT_LOCALE`, `VITE_APP_EMPTY_VALUE`, `VITE_APP_FALLBACK_LOCALE`, `VITE_APP_LOG_LEVEL`, `VITE_APP_LOG_SCOPES`, `VITE_APP_LOGO`, `VITE_APP_NAME`, `VITE_AXIOS_TIMEOUT`, `VITE_CART_STOCK_POLL_SECONDS`, `VITE_FARO_APP_NAME`, `VITE_FARO_APP_VERSION`, `VITE_FARO_ENVIRONMENT`, `VITE_FARO_URL`, `VITE_LOCALE_APP`, `VITE_MAX_UPLOAD_BYTES`, `VITE_TEST_CARDS`, `VITE_UMAMI_SRC`, `VITE_UMAMI_WEBSITE_ID`, `VITE_UMAMI_REQUIRE_CONSENT`, `VITE_VALIDATE_REQUESTS`, `VITE_VALIDATE_RESPONSES`.

## Relationships

No other files in the dependency graph depend on or are depended upon by this file. It is a pure ambient declaration that Vite/TypeScript picks up automatically via `tsconfig.json`'s `include`/`types` resolution.

## Notes

- **Source of truth split:** this file states only the *type* (`string`). The `.env-example` file documents each variable's meaning and default value. Keep them in sync when adding/removing variables.
- **Optional, not required:** every key is declared with `?` because the app already guards each read with a fallback (`?? '10000'`, `|| 'Guebbit'`, etc.). Making them required would force every consumer to null-check.
- **ESLint suppressions are load-bearing:** the `// eslint-disable-next-line unicorn/prevent-abbreviations` comments exist because `ViteTypeOptions` and `ImportMetaEnv` are fixed names Vite uses for its own declaration merging. Renaming them (to satisfy the lint rule) would break the ambient interface extension.
- **Vite's built-in keys** (`BASE_URL`, `MODE`, `DEV`, `PROD`, `SSR`) are *not* redeclared here; they come from Vite's own `vite/client` types.
