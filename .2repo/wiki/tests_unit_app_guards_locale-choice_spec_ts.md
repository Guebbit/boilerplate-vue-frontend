# tests/unit/app/guards/locale-choice.spec.ts

## Purpose

Unit tests for the `localeChoice` Vue Router guard and its `fetchLanguageApi` helper (both in `src/app/guards/locale-choice.ts`). The guard decides per-navigation whether to proceed, load a language, or redirect to a default locale. These tests verify the three decision branches, the dictionary-loading/merging contract (always resolves, never rejects), and that redirect paths preserve route context.

## Key elements

- **`i18nState`** — mutable object (`supportedLanguages`, `loadedLanguages`, `currentLocale`, `defaultLocale`) that individual tests mutate to control what the i18n mock reports.
- **`vi.mock('@/infrastructure/i18n', …)`** — replaces `supportedLanguages`/`loadedLanguages` with getters over `i18nState`, and `changeLanguage`/`updateLocale` with spy mocks, so tests are independent of actual files in `src/locales/`.
- **`vi.mock('@api', …)`** — stubs `getLocales` and `getLocaleMessages` at the network boundary; the real `fetchLanguageApi` merge logic still runs.
- **`routeTo(overrides?)`** — builds a minimal `RouteLocationNormalized` via `asStub`, supplying only `name`, `params`, `query`.
- **`describe('fetchLanguageApi')`** — five cases covering: unsupported locale (no fetch), supported+bundled locale (real dynamic import), overrides-only (no bundled file), network failure on overrides (bundled half still loads), and deep-merge precedence (override wins per-key, siblings preserved).
- **`describe('localeChoice')`** — six cases covering: already-loaded active locale, loaded-but-inactive locale, supported-unloaded locale (fetch → register → activate), unsupported-locale redirect, missing-locale redirect, and no-activation-during-redirect.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub<T>()`, a type-safe helper that casts a partial object to a full type without `as` sprinkled through call sites. Used here exclusively by `routeTo()` to construct route fixtures.

## Notes

- All "proceed" assertions use `toBe(true)` (strict identity), not `toBeTruthy()`. A redirect object is truthy; returning one where `true` is expected causes an infinite navigation loop.
- `fetchLanguageApi` is documented to **always resolve, never reject**; tests assert resolved empty dictionaries on failure paths rather than expecting rejections.
- The i18n mock uses `importOriginal` so non-locale exports of that module remain intact.
- `beforeEach` clears mocks, `localStorage`, and resets `i18nState`; `afterEach` restores real timers.
- The `changeLanguageMock` / `updateLocaleMock` signatures include unused `_locale` / `_messages` parameters solely so `toHaveBeenCalledWith` type-checks against the real function arity.
