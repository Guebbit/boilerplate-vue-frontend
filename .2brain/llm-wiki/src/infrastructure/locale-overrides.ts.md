---
source: src/infrastructure/locale-overrides.ts
sha256: 1762e9dffe5049065f0e88a50d6b1e0391b33aa8ec28face9e51fdd8803ee1e8
generated_at: 2026-10-17T00:11:16.528190+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/locale-overrides.ts

## Purpose

Fetch layer for the runtime (database-backed) half of the i18n dictionaries: the API's locale manifest and per-locale edited overrides. Every function resolves to a safe default rather than rejecting, so the offline-bundled `src/locales/*.json` files remain the guaranteed rendering floor. It lives in the app (not `@/i18n`) because it calls `@api`, the app-specific OpenAPI client that the extractable i18n tier must not depend on.

## Key elements

- **`localeApp()`** — Resolves the app id used in API calls (`VITE_LOCALE_APP` env → `'demo-fe'` fallback).
- **`fetchRemoteLocales()`** — Fetches the API's locale manifest (1.5 s timeout, boot-blocking). Filters to languages with at least one app, records each language's `direction` and `nativeName` into the mutable `localeDirections` / `localeNativeNames` maps, and returns the tag list. Resolves `[]` on any error.
- **`fetchLocaleOverrides(locale)`** — Fetches edited overrides for one locale via `GET /locales/{locale}/messages`. Treats 404 as "nothing edited." Resolves `{}` on any error.
- **`mergeRemoteLocales()`** — Adds API-discovered languages to the exported `supportedLanguages` array **in place** (mutates rather than reassigns so all existing importers see the update). Returns only the newly added tags.
- **`withLocaleOverrides(locale, ownMessages)`** — Fetches overrides for a locale and merges them on top of the bundled dictionary via `mergeDictionaries`.
- **`refreshRunningLocale(locale)`** — Post-write refresh: re-derives the dictionary from the bundled file + fresh overrides (not from current registered state, so a just-deleted override correctly falls back to the bundled default), then calls `updateLocale`. Resolves `void` regardless of outcome.
- **`BOOT_READ_TIMEOUT_MS`** (1 500 ms) — Shorter-than-default budget for the boot-blocking manifest read.

## Relationships

- **`@api`** (`getLocales`, `getLocaleMessages`) — Generated OpenAPI client; the only reason this file cannot live in `@/i18n`.
- **`@/i18n`** — Imports `loadBundledDictionary`, `localeDirections`, `localeNativeNames`, `mergeDictionaries`, `supportedLanguages`, `updateLocale`, and the `TranslationDictionaries` type. Writes direction/native-name data into the mutable maps; pushes into the exported `supportedLanguages` array.
- **`@/infrastructure/runtime-config`** — Imports `runtimeValue` for the `LOCALE_APP` lookup (env-independent accessor).

## Notes

- **Never rejects.** Every exported promise resolves (to `[]`, `{}`, or `void`) on failure. A slow, stale, or absent API must not block a locale switch or turn a saved edit into an error toast.
- **Mutation of `supportedLanguages`.** `mergeRemoteLocales` pushes into the shared array rather than returning a new one; importers hold a reference to the same array, so they see the update without re-importing.
- **`refreshRunningLocale` re-derives from the bundle.** It deliberately does not merge overrides onto the *currently registered* dictionary, because a deleted override must fall back to the bundled default.
- **Frontend vs. backend app languages are intentionally not cross-checked.** A language can appear in the UI switcher without the API supporting it (or vice versa); that inconsistency is considered a human editorial decision.
- **The API's own dictionary is NOT fetched here.** The API resolves its keys server-side and ships finished text; its overrides never leave the backend.
