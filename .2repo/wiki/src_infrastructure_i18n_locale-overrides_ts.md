# src/infrastructure/i18n/locale-overrides.ts

## Purpose

Fetch layer for the runtime half of the i18n dictionaries: it pulls the API's language manifest and per-locale override messages, then merges them over the offline-bundled `src/locales/*.json` files. Every function resolves to a safe default (empty list, empty object) and never rejects, guaranteeing the app remains fully usable when the network is absent.

## Key elements

- **`localeTenant()`** — Returns the frontend tenant ID from `VITE_LOCALE_TENANT` (trimmed) or falls back to `'demo-fe'`. Used as the `tenant` parameter when requesting messages.
- **`fetchRemoteLocales(): Promise<string[]>`** — Calls `getLocales()`, filters to languages with at least one tenant, records each language's direction into the shared `localeDirections` map (side effect), and returns the tag list. Resolves to `[]` on any error.
- **`fetchLocaleOverrides(locale): Promise<TranslationDictionaries>`** — Calls `getLocaleMessages(locale, { tenant })` and returns `response.data.messages`. Resolves to `{}` on any error (including 404, which means "nothing edited").
- **`mergeRemoteLocales(): Promise<string[]>`** — Calls `fetchRemoteLocales`, then **mutates** the imported `supportedLanguages` array in place via `push`. Returns only the newly added tags.
- **`withLocaleOverrides(locale, ownMessages): Promise<TranslationDictionaries>`** — Fetches overrides for one locale and passes the pair through `mergeDictionaries(ownMessages, overrides)`. The bundled text is the floor; overrides win per key.

## Relationships

- **`src/infrastructure/i18n/index.ts`** — This file imports `localeDirections`, `mergeDictionaries`, `supportedLanguages`, and the `TranslationDictionaries` type from `index.ts`. It writes into `localeDirections` (direction side-effect in `fetchRemoteLocales`) and mutates `supportedLanguages` (in `mergeRemoteLocales`), so `index.ts`'s re-exports are the shared state those mutations update.
- **`src/modules/demo/tests/guards.spec.ts`** — Consumes the exported fetch/merge functions to verify the never-reject contract and the per-key fallback behavior described in the module docs.

## Notes

- **Mutate, don't reassign.** `mergeRemoteLocales` pushes into `supportedLanguages` rather than creating a new array, because a dozen import sites hold a binding to the original reference.
- **Direction recording is a side effect.** `fetchRemoteLocales` populates `localeDirections` inside its `.map()` callback. If you call `fetchRemoteLocales` purely for the tag list and discard the result, the directions are still recorded.
- **404 ≠ error.** A missing locale on the messages endpoint is an ordinary "nothing edited here" answer, not a failure condition.
- **API's own dictionary is out of scope.** The backend resolves its own keys server-side; this file must never merge the backend's keyspace onto the frontend's. See `docs/theory/layers.md`.
