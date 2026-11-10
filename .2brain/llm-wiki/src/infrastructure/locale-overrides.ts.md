---
source: src/infrastructure/locale-overrides.ts
sha256: 2293af5ddb7d1d7beea6da9bb9537e42a00c1a2d2d06a1d8d71235e5af73a96c
signature: 64b171e4de7f6ff3c3b614e1c52bbe7cdd16b2cc5e73e55967f63cb3b09738e9
generated_at: 2026-11-10T03:07:39.215486+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/locale-overrides.ts

## Purpose

Fetch layer for the runtime half of the app's dictionaries. It calls the app's own API (`@api`) to retrieve the locale manifest and per-locale message overrides, then merges those overrides on top of the statically bundled `src/locales/*.json` files. It lives in the app tier (not `@/i18n`) because it depends on the app-specific OpenAPI client, which the extractable i18n tier must not import.

## Key elements

- **`localeApp()`** – Resolves the app identifier used in API calls (from `runtimeValue`, `VITE_LOCALE_APP`, or the `'demo-fe'` fallback).
- **`BOOT_READ_TIMEOUT_MS`** (1500 ms) – Short timeout for the boot-blocking manifest read; `main.ts` awaits this before mount.
- **`RemoteLocales`** (interface) – Shape of the parsed manifest: `offered`, `switchedOff`, `drafts`, `keep`.
- **`draftLanguages`** – Reactive `Set<string>` of draft languages visible to the current caller; refilled on every manifest read.
- **`isDraftLanguage(tag)`** – Whether the caller is previewing a draft language.
- **`isSwitchedOffForThisCaller(language)`** – Internal check: language is inactive *and* source is `'static'` (no draft row visible to this caller).
- **`readRemoteLocales()`** – Internal; calls `listLocales`, classifies each row, and records `localeDirections` / `localeNativeNames` as a side effect.
- **`fetchRemoteLocales()`** – Returns the offered language tags (or `[]` on failure).
- **`fetchLocaleOverrides(locale)`** – Fetches one locale's edited overrides via `getLocaleMessages`; 404 or error yields `{}`.
- **`mergeRemoteLocales()`** – Reconciles the exported `supportedLanguages` array with the manifest: adds API-only languages, removes switched-off ones (except `keep`), and resets `draftLanguages`. Mutates the array in place via `splice`.
- **`withLocaleOverrides(locale, ownMessages)`** – Merges fetched overrides on top of a bundled dictionary using `mergeDictionaries`.
- **`updateLocale` re-export / refresh function** (truncated in source) – Re-derives a running app's dictionary after a write for the translation admin's live preview.

## Relationships

- **`src/app/components/use-language-switch.ts`** – Consumes `fetchRemoteLocales`, `isDraftLanguage`, and `mergeRemoteLocales` to populate the language switcher and display draft cues.
- **`src/modules/locales/tests/languages-list-actions.spec.ts`** – Tests the exported fetch and merge functions (`mergeRemoteLocales`, `fetchLocaleOverrides`, `withLocaleOverrides`) against the API contract.
- **`src/modules/stock-alerts/components/NotifyMeButton.vue`** – Downstream consumer of the locale system; its translatable strings are resolved through the merged dictionaries that `withLocaleOverrides` produces.

## Notes

- **Never rejects.** Every exported function resolves to a safe default (empty list, empty object). The offline-bundled JSON is the guaranteed floor.
- **`mergeRemoteLocales` mutates `supportedLanguages` in place** (`splice`) because the array is imported by value in many modules; reassigning the binding would leave them stale.
- **`draftLanguages` is refilled, not appended to,** on every manifest read so a sign-out correctly clears draft visibility.
- **Frontend vs. backend locale sets are deliberately not cross-checked.** A language can be bundled for the UI while the API has no wording for it (and vice versa); this is treated as a human judgment call, not a validation error.
- **The API's own dictionary is never fetched here.** The API resolves its own keys server-side; fetching them on the client would adopt the backend's keyspace into the frontend.
- **`localeApp()` falls back to `'demo-fe'`** so a fresh checkout with no `.env` still talks to the demo backend.
