---
source: src/infrastructure/locale-overrides.ts
sha256: 4863915c906336fa2aebf0e4fb92ad6d5df8341f8b8f891cf0f78c16afb5710c
generated_at: 2026-10-02T12:00:15.009558+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/locale-overrides.ts

## Purpose

Fetch layer for the runtime (database-backed) half of the locale dictionaries. It retrieves the API's language manifest and per-locale override messages, then merges them over the offline-bundled JSON files so that edited translations appear without a rebuild. Lives here rather than in `@/i18n` because it depends on the app-specific OpenAPI client (`@api`), which the extractable runtime module must not import.

## Key elements

- **`localeTenant()`** – Resolves the frontend tenant id from `runtimeValue('LOCALE_TENANT')`, then `VITE_LOCALE_TENANT`, falling back to `'demo-fe'`.
- **`fetchRemoteLocales()`** – Calls `getLocales` with a 1500 ms boot-read timeout. Returns the API's language tags (those with at least one tenant) and side-records each tag's `direction` and `nativeName` into the `localeDirections` / `localeNativeNames` maps from `@/i18n`. Resolves to `[]` on any error.
- **`fetchLocaleOverrides(locale)`** – Calls `getLocaleMessages` for the given tag and tenant. Returns `response.data.messages` or `{}` on error/404.
- **`mergeRemoteLocales()`** – Discovers API languages not already in `supportedLanguages` and pushes them into that exported array in place (so existing importers see the update). Returns only the newly added tags.
- **`withLocaleOverrides(locale, ownMessages)`** – Fetches overrides for `locale` and merges them over `ownMessages` via `mergeDictionaries`. This is the per-language dictionary builder used at startup.
- **`refreshRunningLocale(locale)`** – After an edit in the translation admin, re-derives the full dictionary from the bundled file + fresh overrides and calls `updateLocale` so the running app reflects the change without a full navigation. Resolves to `undefined` on any failure.

All exported functions **resolve, never reject** — the offline-bundled files are the guaranteed floor.

## Relationships

- **`src/modules/demo/tests/guards.spec.ts`** – Tests the guard behaviors of this module (e.g., that `fetchRemoteLocales` and `fetchLocaleOverrides` resolve to safe defaults when the API is unreachable, and that `refreshRunningLocale` never propagates a rejection to the caller).
- **`@/i18n`** – Provides `supportedLanguages`, `localeDirections`, `localeNativeNames`, `mergeDictionaries`, `loadBundledDictionary`, and `updateLocale`; this module mutates the former three and composes the rest.
- **`@/infrastructure/runtime-config`** – Supplies `runtimeValue` for the tenant lookup.
- **`@api`** – The generated OpenAPI client (`getLocales`, `getLocaleMessages`); this is the reason the file cannot live in the extractable runtime package.

## Notes

- `fetchRemoteLocales` uses a **1500 ms timeout** (`BOOT_READ_TIMEOUT_MS`) because `main.ts` awaits it before mount; the client's default is 10 s.
- `mergeRemoteLocales` **mutates** `supportedLanguages` in place (`.push`) rather than returning a new array, because a dozen call sites hold a direct reference.
- Frontend and backend tenant lists are **deliberately not cross-checked**: a language can be bundled for the UI without the API supporting it, and vice-versa. No validation or warning is emitted.
- `refreshRunningLocale` re-reads the bundled file each time (via `loadBundledDictionary`) instead of merging onto the currently registered dictionary, so a deleted override correctly falls back to the bundled default.
- The API's own tenant-level overrides are layered server-side and never sent to this client; merging them here would conflate keyspace ownership (see `docs/theory/layers.md`).
