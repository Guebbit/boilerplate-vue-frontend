---
source: src/i18n/index.ts
sha256: 04275f219e0c03cc8cf76ac5f381b3c8563f1321ede40078fd29286296b385c2
generated_at: 2026-10-17T00:08:14.898186+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/index.ts

## Purpose

Core i18n runtime that owns the full locale lifecycle: which languages exist, which are loaded, and the load → merge → activate pipeline every locale switch passes through. It is deliberately self-contained (no app modules, no Pinia, no API client) so that `src/i18n/` can be lifted into a standalone package with minimal further work.

## Key elements

- **`supportedLanguages`** — Mutable array of all offered locales. Seeded at build time from `/src/locales/*.json`, then extended at boot by `mergeRemoteLocales` with API-reported languages.
- **`loadedLanguages`** — Tracks which locale dictionaries have been fetched into memory.
- **`localeDirections`** / **`localeNativeNames`** — Per-locale metadata (LTR/RTL, endonym) populated by `mergeRemoteLocales`; empty offline.
- **`registerLocaleContributors(loadersByLocale)`** — Installs per-locale module dictionary loaders. Replaces (not appends) the previous map. Must be called before the first `_loadLocale`.
- **`i18n`** — The app-wide `vue-i18n` instance (composition-API mode, `legacy: false`). Reads `APP_DEFAULT_LOCALE` / `APP_FALLBACK_LOCALE` from `window.__APP_CONFIG` with a Vite env fallback.
- **`translate(key, named?)`** — Standalone translate call usable outside component setup (used by Zod schema thunks).
- **`_loadLocale(i18n, locale)`** — Loads a locale's JSON (code-split per locale), merges module dictionaries via `_updateLocale`, then activates it. Falls back to `getDefaultLocale()` on failure.
- **`mergeDictionaries(base, extra)`** — Deep merge where nested objects combine but arrays are replaced wholesale (avoids half-merged sentences). Neither argument is mutated.
- **`loadBundledDictionary(locale)`** — Resolves the merged bundled dictionary (shared + module slices) as a plain object without touching the running `i18n` instance. Used by the translation admin for non-active locales.
- **`TranslationDictionaries`** — Recursive type for message trees; leaf values may be `string`, `string[]`, or nested objects (arrays render via vue-i18n's `tm()`/`rt()`).
- **`runtimeLocaleValue(name)`** — Local helper that reads a key from `window.__APP_CONFIG` (trimmed, `undefined` when unset) without importing the app's runtime-config module.

## Relationships

- **`src/i18n/language-label.ts`** — Consumes `localeNativeNames` and/or `supportedLanguages` to display a locale's endonym in the language switcher.
- **`src/i18n/router-link.ts`** — Uses `translate` (or the `i18n` instance) to resolve locale-aware route labels.
- **`src/kernel/registry.ts`** — Acts as the composition root that calls `registerLocaleContributors`, wiring each enabled module's locale loader map into this module at boot.

## Notes

- `supportedLanguages` is **mutable by design**: `mergeRemoteLocales` pushes onto it at boot. Reassigning the binding would orphan the ~dozen modules that import it by value.
- Locale JSON files are code-split via `import.meta.glob` (Vite requires a static literal) and dynamic `import()`. The Stryker `StringLiteral` mutations on those lines are disabled because the mutated form breaks Vite's static analysis and kills the entire test run rather than producing a surviving mutant.
- `window.__APP_CONFIG` is read directly (two keys only) rather than importing `@/infrastructure/runtime-config`, preserving the package's lift-out contract.
- `moduleLocaleLoaders` is a plain `let` at module scope; there is no getter/setter pair. Callers must invoke `registerLocaleContributors` exactly once (typically in `main.ts`) before any `_loadLocale` call.
- The array-replacement rule in `mergeDictionaries` is intentional: a translated list is edited as a unit; index-merging two arrays would interleave languages.
