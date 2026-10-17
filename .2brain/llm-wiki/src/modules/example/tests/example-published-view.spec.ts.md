---
source: src/modules/example/tests/example-published-view.spec.ts
sha256: db36c9aeed310a63ecb45b9f1bec7de89c382d6276dd59a08c4b7823c302178e
generated_at: 2026-10-17T00:52:59.943563+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/example-published-view.spec.ts

## Purpose

Unit-tests the `ExamplePublished` view in isolation: verifies it renders fetched data with owner attribution, redirects to the shell's Error page on a 404 response, and renders nothing while the fetch is still pending.

## Key elements

- **`router`** — A `createRouter` instance using `createMemoryHistory`, scoped to `collectModuleRoutes(enabledModules)` plus a stub `Error` route, so the redirect assertion has a real route to land on without the full app shell.
- **`PUBLISHED`** — A fixed `Example` fixture (id `ex-1`, status `published`) used as both the `id` prop and the resolved payload.
- **`mountPage(answer)`** — Spies on `useExampleStore().fetchPublished` with the caller-supplied resolver, then mounts `ExamplePublished` with Vuetify, i18n, and the memory router. Returns `{ wrapper, fetchPublished }`.
- **`beforeEach`** — Resets Pinia, clears `document.body`, loads the `en` locale, and pushes the published route so `router.isReady()` resolves before each case.
- **Three `it` blocks** — happy-path render, 404 redirect (asserts `router.currentRoute.value.name === 'Error'`), and pending-state (body element absent).

## Relationships

- **`src/modules/example/store.ts`** — The test replaces `useExampleStore().fetchPublished` with a `vi` spy to control what the view receives; no real network call occurs.
- **`src/modules/example/views/ExamplePublished.vue`** — The component under test; mounted with the `id` prop and read via `data-test` attributes.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top level so `collectModuleRoutes(enabledModules)` can resolve the example module's route entries before the router is built.

## Notes

- The mock is installed **before** `mount`; the view reads during its setup phase, not in `onMounted`. Calling `fetchPublished` post-mount would not be intercepted.
- The 404 case uses `vi.waitFor` (polling) rather than `flushPromises` because the redirect is an async navigation that may span multiple microtask ticks.
- The rejection value is an `Error` augmented via `Object.assign` with `{ success, status, errors }` — this satisfies the project lint rule that promise rejections must be `Error` instances while still exposing the HTTP envelope the view reads (`status`).
- `attachTo: document.body` is required so Vuetify overlay/portal components render; `document.body.innerHTML` is cleared in `beforeEach` to avoid cross-test leakage.
