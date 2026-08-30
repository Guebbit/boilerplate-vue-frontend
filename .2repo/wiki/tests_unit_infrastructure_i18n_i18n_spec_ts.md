# tests/unit/infrastructure/i18n/i18n.spec.ts

## Purpose

Unit tests for the i18n locale machinery (`@/infrastructure/i18n`) executed against a **real** `vue-i18n` instance rather than a mock. It covers locale loading, activation, fallback behaviour, browser-language detection, and the `routerLinkI18n` path-prefix helper — the layer that the router-guard spec (`locale-choice.spec.ts`) deliberately stubs out.

## Key elements

- **`freshInstance()`** — local helper that creates a disposable `vue-i18n` instance (`legacy: false`), so tests never mutate the app-wide singleton.
- **`withLoadedLanguagesRestored()`** — snapshots and restores the mutable `loadedLanguages` array between tests.
- **`describe('supportedLanguages')`** — verifies the list is derived from the `src/locales` directory (en, it) and that it accepts runtime additions (e.g. `es`) via `supportedLanguages.push`.
- **`describe('_loadLocale')`** — tests dynamic dictionary import + activation, short-circuit when already loaded, unsupported-locale fallback, and graceful degradation when the import rejects.
- **`describe('_updateLocale')`** — tests registering a dictionary from a non-bundle source and overwriting without duplicating the `loadedLanguages` entry.
- **`describe('_changeLanguage')`** — tests the full switch: `<html lang>`/`<html dir>` sync, fallback-dictionary loading, and load-then-activate ordering.
- **`describe('getDefaultLocale')`** — tests browser-language matching against `supportedLanguages` (not `loadedLanguages`) and the `en` fallback.
- **`describe('routerLinkI18n')`** — tests locale-path prefixing for plain strings, relative paths, already-prefixed paths, and path-based location objects.

## Relationships

No graph neighbours are listed. The file imports the module under test (`@/infrastructure/i18n`), the `routerLinkI18n` helper (`@/infrastructure/i18n/router-link.ts`), and the shipped locale fixtures (`@/locales/en.json`, `@/locales/it.json`) solely to assert output.

## Notes

- The `_`-prefixed functions accept the instance as a parameter specifically so tests can use throwaway instances; the app-wide singleton is only touched in the `routerLinkI18n` block.
- `vi.resetModules()` + dynamic `import()` is used in the `supportedLanguages` and `getDefaultLocale` blocks to re-evaluate the module's glob-based language list in a clean state.
- `localeDirections` is module-level shared state; the RTL test manually sets and then deletes `localeDirections.ar` in a `finally` block.
- The test file asserts against the **contents** of `en.json` / `it.json` (e.g. `enMessages.navigation['error-already-logged']`) rather than hard-coding expected strings, so copy changes don't break the spec.
