---
source: src/modules/locales/tests/locale-entries-url.spec.ts
sha256: ffeee00826c814c121fa9e4c94557bb2f9c1094b9e3c1f05dcba597760127053
signature: c65e69488772deba81c8c3c58ce7fcf570fccaed03eed91c3d1c525572e6a449
generated_at: 2026-11-10T04:44:34.343614+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/locale-entries-url.spec.ts

## Purpose

Verifies that the LocaleEntries view reads the `app`, `text`, and `page` query parameters from the URL and passes them through to the initial `listAppLocaleEntries` call. This ensures that a shared link reproducing a filtered, paginated state actually opens the list in that state.

## Key elements

- **`wireModulesIntoCore()`** – imported from test support; registers module routes and stores into the core registry before any test runs.
- **`emptyPage()`** – factory returning a resolved promise of an empty `{ items: [], meta: { totalItems: 0, totalPages: 0 } }` shape, used as the default API response.
- **`vi.mock('@api', …)`** – spreads the real module via `importOriginal`, then overrides `listLocaleEntries`, `listAppLocaleEntries`, `listLocales`, and `listLocaleApps` with vi.fn stubs returning `emptyPage()` or a minimal locale/app list.
- **`router`** – a `vue-router` instance using `createMemoryHistory` with a single `/:locale` route whose children come from `collectModuleRoutes(enabledModules)`, so real module paths resolve.
- **`beforeEach`** – clears all mocks, installs a fresh Pinia instance, and loads the `'en'` locale.
- **`it('reads the app, text and page its link names')`** – the single test: pushes `/en/locales/it?app=demo-fe&text=ciao&page=2`, mounts `LocaleEntries` with the router, flushes promises, then asserts `listAppLocaleEntries` was called with `'it'`, `'demo-fe'`, and an object containing `{ page: 2, text: 'ciao' }`.

## Relationships

- **`src/modules/locales/views/LocaleEntries.vue`** – the component under test; mounted directly in the single test case.
- **`tests/support/unit/wire-modules.ts`** – provides `wireModulesIntoCore()`, called once at module scope to populate the module registry so `collectModuleRoutes(enabledModules)` yields real routes.

## Notes

- The mock uses `importOriginal` so that any other `@api` exports consumed by the view (e.g. helper functions) remain functional; only the four list-fetching endpoints are stubbed.
- Navigation is done via `router.push` *before* `mount`, not through an in-component link, so the `RouterLink: true` stub is irrelevant to the assertion path—it merely prevents Vue from warning about an unresolvable `<RouterLink>`.
- `emptyPage` is an async function (returns a Promise), and the vi.fn stubs return it directly (`() => emptyPage()`), meaning the API layer contract (Promise-based) is preserved.
