---
source: src/i18n/index.ts
sha256: 1a1fd8c24290589c5f71b76b7f7bc9567a1b165156e7bc162f509122d13ce524
signature: f8e07f14eb209c4aa3c6f8940bc532fe7d727de469ae43c7651b6b049be78ed9
generated_at: 2026-11-10T03:00:27.800604+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/index.ts

## Purpose
Core i18n runtime that manages which languages exist, which are loaded, and the load → activate → merge pipeline every locale switch passes through. Bundled dictionaries are code-split per locale via Vite dynamic imports. The file is deliberately self-contained (no app-specific imports) so the entire `src/i18n/` directory can be extracted into a standalone package.

## Key elements
- **`bundledLocales`** — array of locale codes discovered at build time from `src/locales/*.json` via `import.meta.glob`.
- **`supportedLanguages`** — mutable array starting as `bundledLocales`; extended at boot by `mergeRemoteLocales` with API-reported languages.
- **`loadedLanguages`** — tracks which locales have been fetched into memory during the session.
- **`localeDirections` / `localeNativeNames`** — records populated by `mergeRemoteLocales` at boot (RTL flag, native self-name).
- **`registerLocaleContributors`** — installs per-locale dictionary loaders contributed by enabled modules; must be called before the first `loadLocale`.
- **`i18n`** — the shared `vue-i18n` instance (`legacy: false`); locale/fallback read from `__APP_CONFIG` then `.env` then `'en'`.
- **`translate`** — module-scope key lookup bound to `i18n.global.t`; used outside components (e.g. Zod schema thunks).
- **`_loadLocale`** — loads a locale's JSON (dynamic import), merges module dictionaries via `_updateLocale`, then activates it; falls back to default on failure.
- **`mergeDictionaries`** — deep-merges two `TranslationDictionaries` with the rule that arrays are replaced wholesale (not index-merged); uses `structuredClone` so neither argument is mutated.
- **`loadBundledDictionary`** — resolves the full merged dictionary (shared + all module slices) for a locale as a plain object, without touching the running `i18n` instance.
- **`runtimeLocaleValue`** — reads `APP_DEFAULT_LOCALE` / `APP_FALLBACK_LOCALE` from `window.__APP_CONFIG` to keep this file free of app-module imports.
- **`TranslationDictionaries`** — recursive interface allowing `string`, `string[]`, nested objects, and arrays of objects (for `tm()`/`rt()` rendering of lists).

## Relationships
- **`src/i18n/language-label.ts`** — consumes `supportedLanguages` and/or `localeNativeNames` to render a human-readable label for a given locale code.
- **`src/i18n/router-link.ts`** — relies on `translate` (or the `i18n` instance) to produce localized route labels for navigation.
- **`src/kernel/registry.ts`** — calls `registerLocaleContributors` from the composition root, wiring each enabled module's locale loader into this runtime without `src/i18n/` importing any module.
- **`src/modules/notifications/store.ts`** — imports `translate` to produce localized notification messages at runtime.

## Notes
- `supportedLanguages` is **mutable by design**: `mergeRemoteLocales` pushes onto it, and many modules import the binding by reference. Reassigning the variable would desynchronize those consumers.
- `mergeDictionaries` replaces arrays whole (a translated list is edited in full); it does **not** merge array elements index-by-index.
- `runtimeLocaleValue` duplicates the two-line `__APP_CONFIG` read from `@/infrastructure/runtime-config` intentionally, to avoid a cross-package import that would break extraction.
- Several `import()` template literals carry `// Stryker disable` comments because Vite requires a static string for code-splitting analysis; mutating them breaks the entire build.
- `legacy: false` is mandatory — the composition API (`i18n.global.t`) depends on it.
- The `customSnakeCase` modifier joins spaces with underscores; it is the only registered vue-i18n modifier.
