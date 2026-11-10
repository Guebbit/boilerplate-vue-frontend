---
source: tests/unit/app/error-page.spec.ts
sha256: 2a566b90596ea32ba643a61f5da81e94a236ddb6911d93282642abf0e71d204f
signature: f285911863f474048a89261c29dff04d9e407a8f21938969ba7aa4093a309864
generated_at: 2026-11-10T07:45:09.154102+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/error-page.spec.ts

## Purpose

Unit tests for `Error.vue`, the shell's catch-all error page. Verifies that the view renders a status code in the heading, translates messages that match the app's own i18n keys, folds any free-form or missing message into a generic key (never displaying it verbatim), carries its own root `id`, and links back Home under the current locale.

## Key elements

- **`routes`** — Two-route config: the `ErrorPage` route (`/:locale/error`, `props: true`) and a stub `Home` route (`/:locale`). Used to build a memory-history router for the tests.
- **`router`** — A `createMemoryHistory` router over `routes`; provides the navigation context the component expects.
- **`mountError(query)`** — Test helper that pushes to the `ErrorPage` route, then mounts `ErrorPage` directly with `status`/`message` props and the `vuetify` + `i18n` + `router` plugins.
- **`beforeEach(() => loadLocale('en'))`** — Ensures the English locale bundle is loaded before every test case.
- **`describe('Error page', …)`** — Six `it` blocks covering: root `id` attribute, status in `<h1>`, i18n-key translation, free-form message folding, missing-message fallback, and locale-prefixed home link.

## Relationships

No graph neighbors are identified for this file in the dependency graph. The spec imports `Error.vue`, the `i18n`/`loadLocale` helpers, and the `vuetify` plugin under test, but none of those modules are tracked as neighbors here.

## Notes

- An inline `eslint-disable` suppresses `@typescript-eslint/no-unsafe-assignment` on the `ErrorPage` component reference because TypeScript-ESLint cannot fully resolve the `.vue` SFC's type; an explicit `RouteRecordRaw[]` target does not help.
- The doc comment states the view **no longer renders `LayoutDefault`**; tests therefore do not stub or assert on it.
- The free-form-message fold is described as the view's *own* defence, layered on top of the same fold `router.onError` performs before pushing to this route — the tests confirm both paths.
- `mountError` navigates first, then mounts manually (not via the router outlet), so the component is exercised in isolation with explicit props rather than through a full-app render.
