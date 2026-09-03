# src/infrastructure/i18n/index.ts

## Purpose

Core i18n runtime that owns the full locale lifecycle: which languages are available, which are loaded, and the load → activate → merge pipeline every locale switch goes through. Bundled dictionaries are code-split per locale via dynamic `import()`, and module-contributed dictionaries are layered on top at boot or on demand. API-fetched overrides are deliberately **not** applied here; they are handled at the edges.

## Key elements

- **`TranslationDictionaries`** — Recursive interface describing one locale's message tree; allows `string`, `string[]`, nested objects, and arrays of objects (for `tm()`/`rt()` list rendering).
- **`supportedLanguages`** — Mutable `string[]` starting from the bundled-locale glob; extended at boot by `mergeRemoteLocales` with API-reported languages. Imported by value across ~12 modules, so it is mutated in place rather than reassigned.
- **`loadedLanguages`** — Tracks which locales have been fetched into the vue-i18n instance; used as a fast-path guard in `_loadLocale` and `_updateLocale`.
- **`localeDirections`** — `Record<string, 'ltr' | 'rtl'>` filled by `mergeRemoteLocales`; read by `_changeLanguage` to set `<html dir>`. Empty offline (all bundled locales are LTR).
- **`registerLocaleContributors`** — Replaces (not appends) the internal `moduleLocaleLoaders` map. Must be called from the composition root before the first `loadLocale`; `infrastructure` cannot import `@/modules` directly.
- **`i18n`** — The single app-wide `vue-i18n` instance (`legacy: false`). Default and fallback locales come from `VITE_APP_DEFAULT_LOCALE` / `VITE_APP_FALLBACK_LOCALE`, defaulting to `'en'`.
- **`translate`** — Thin wrapper over `i18n.global.t` for use outside component setup (e.g. Zod schema thunks in `src/modules/<domain>/schemas.ts`).
- **`_loadLocale` / `loadLocale`** — Dynamic-imports `@/locales/<locale>.json`, merges module dictionaries via `_updateLocale`, then activates the locale. Falls back to the default locale on import failure.
- **`mergeDictionaries`** — Deep-merges two `TranslationDictionaries` using `lodash-es`' `mergeWith` with a customizer that replaces arrays wholesale (a translated list is edited whole or not at all). Clones `base` to avoid mutation.
- **`loadBundledDictionary`** — Returns the merged bundled dictionary (shared + module slices) as a plain object **without** touching the running i18n instance. Resolves `{}` for unknown locales. Intended for the translation admin to read a baseline for a non-active language.
- **`_updateLocale` / `updateLocale`** (truncated) — Calls `setLocaleMessage` (cloned) then deep-merges each module's dictionary via `mergeLocaleMessage`. All install paths funnel through this function so no path leaves a locale monolingual.

## Relationships

- **`locale-overrides.ts`** — Sits at the edges (`main.ts`, router guard) and layers API-edited overrides on top of the dictionaries this file installs. This file never imports or applies those overrides; the separation keeps the core pipeline override-agnostic.
- **`router-link.ts`** — Acts as a consumer of the locale-switching surface (guard → `_updateLocale` / `loadLocale` path). It triggers locale activation without owning the merge logic.

## Notes

- `supportedLanguages` is **mutable by design** — `mergeRemoteLocales` pushes onto it at boot. Reassigning the export would leave all ~12 importing modules on the stale boot-time list.
- `setLocaleMessage` **replaces** a locale wholesale; `mergeLocaleMessage` **deep-merges**. `_updateLocale` deliberately uses the former for the shared dictionary (cloned) and the latter for each module slice so multiple modules can contribute to the same namespace (e.g. `navigation`).
- `mergeDictionaries` replaces arrays rather than merging by index to avoid producing a sentence half in each language.
- Stryker `StringLiteral` mutants are disabled on the three dynamic `import()` template literals because Vite requires a statically analysable string; a mutated literal breaks the whole build rather than producing a surviving mutant.
- `loadBundledDictionary` never rejects; an unknown locale resolves to `{}`. This is the expected state for a language added through the admin panel that has no bundled file.
