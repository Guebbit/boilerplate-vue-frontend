---
source: tests/unit/app/error-page.spec.ts
sha256: 2a566b90596ea32ba643a61f5da81e94a236ddb6911d93282642abf0e71d204f
generated_at: 2026-10-17T02:30:13.988721+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/error-page.spec.ts

## Purpose

Unit tests for `Error.vue`, the shell's catch-all error page. Verifies that the component displays the router-supplied status, translates messages that match the app's own i18n keys (`error-page.*` / `navigation.*`), folds any other free-form text into a generic message rather than rendering it verbatim, and links back Home under the active locale.

## Key elements

- **`routes`** — Two-route table: the `ErrorPage` route (`/:locale/error`, `props: true`) and a stub `Home` route (`/:locale`).
- **`router`** — `createRouter` with `createMemoryHistory`, used only to satisfy the router plugin requirement; no real navigation occurs.
- **`mountError(query)`** — Helper that pushes the error route, then `mount`s `ErrorPage` directly with `status`/`message` from the query as props, injecting `vuetify`, `i18n`, and `router`.
- **`beforeEach(() => loadLocale('en'))`** — Ensures the English locale dictionary is loaded before every assertion.
- **`describe('Error page')`** block containing six tests:
  - Root element carries `id="error-page"`.
  - `<h1>` contains the numeric status.
  - An i18n key string (`error-page.not-found`) is translated away (asserted by absence of the raw key).
  - Arbitrary text (`"Network Error: fetch failed"`) is not shown verbatim.
  - A missing `message` still yields non-empty rendered text.
  - The home link's `href` is `/en` (locale-prefixed).

## Relationships

None — the dependency graph lists no neighbors. The file imports the SFC under test (`@/app/views/Error.vue`), the shared `i18n` / `loadLocale` utilities, and the `vuetify` instance, but no other test or module in the repo references this spec.

## Notes

- **LayoutDefault is intentionally absent.** The doc comment and the `mount` options confirm the view no longer wraps itself in `LayoutDefault`; the test does not stub or assert on it.
- **Assertions are absence-based for translation/folding.** The tests verify the raw key or raw text is *not* in the rendered output but do not assert the exact translated/generic string, keeping the suite decoupled from copy changes.
- **ESLint suppression on `routes`.** A `@typescript-eslint/no-unsafe-assignment` disable is required because the linter cannot fully resolve a `.vue` SFC's type even when the array is explicitly typed as `RouteRecordRaw[]`.
- **`mountError` passes query values as props, not via route params.** The route push includes `query` in the navigation object, but the component receives `status`/`message` through the explicit `props` option in `mount`, not through `props: true` resolution.
