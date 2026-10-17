---
source: src/modules/example/tests/example-create-view.spec.ts
sha256: 20f5415b4290ad0c2d0332fafd8edca8c4e1a42e06b5ae3028157b55ea2e4388
generated_at: 2026-10-17T00:52:34.440345+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/example-create-view.spec.ts

## Purpose

Component-level integration test for the **ExampleCreate** view. It mounts the real page against a real (memory-history) router and a real Pinia store with the store's `createExample` action spied, then verifies four behaviours: pre-submit validation refusal, the exact payload sent on success, the post-create navigation target, and how server refusals (field-specific vs. generic) are surfaced in the UI.

## Key elements

- **`router`** — A `vue-router` instance using `createMemoryHistory`, with routes collected via `collectModuleRoutes(enabledModules)`. Ensures the post-create redirect is a genuine route navigation.
- **`CREATED: Example`** — Typed fixture matching the `Example` contract from `@types`; used as the resolved value of a successful create. Contract drift causes a compile error here.
- **`mountPage()`** — Spies `useExampleStore().createExample` *before* mounting `ExampleCreate`, then mounts the component with the router, Vuetify, i18n plugins, and a stubbed `LayoutDefault`. Returns `{ wrapper, create }` (the spy).
- **`fillAndSubmit(wrapper, title, body)`** — Sets values on `[data-test=example-title] input` and `[data-test=example-body] textarea`, triggers `form` submit, and flushes promises.
- **`beforeEach`** — Resets Pinia, clears `document.body`, loads the `en` locale, and pushes the router to `/en/examples/create` before each test.
- **`describe('ExampleCreate')`** — Four cases: empty-title refusal (no store call, validation message visible); successful create (exact `{title, body}` payload, navigation to `/en/examples/ex-1`); 422 field error (message lands on the named field's `.v-messages`, route unchanged); 500 generic error (`.example-create-error` banner shown, route unchanged).

## Relationships

- **`src/modules/example/store.ts`** — `useExampleStore` is imported and its `createExample` action is spied. The spy must be installed before mount because the view destructures the action during `setup()`.
- **`src/modules/example/views/ExampleCreate.vue`** — The component under test; mounted directly (not through the app shell).
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register module routes into the core registry so `collectModuleRoutes(enabledModules)` can resolve real paths for the memory router.

## Notes

- The store spy is created **before** `mount()`; the view reads the action reference at setup time, so spying after mount would not intercept calls.
- Navigation assertion in the success case uses `vi.waitFor` in a retry loop rather than a single `flushPromises`, because the router transition is multi-tick.
- `LayoutDefault` is stubbed with a pass-through slot to avoid loading the full layout shell.
- The `CREATED` fixture is typed against `@types` `Example`, so any added/required field in the generated contract breaks compilation of this file.
- i18n loading (`loadLocale('en')`) is async and happens in `beforeEach`; tests depend on translations being available before assertions on `.v-messages` text.
