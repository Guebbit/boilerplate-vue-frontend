---
source: src/modules/locales/tests/languages-list-actions.spec.ts
sha256: 0b0d9dd686253954e9c7408db9e85f9bdef626c04b68ec15ec5f593374119f72
signature: 1c4e4b3657d0d091209b253eb772fbca051bf0d28f8861dbb5379443fd7c4629
generated_at: 2026-11-10T04:44:23.760607+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/languages-list-actions.spec.ts

## Purpose

Unit-test suite for the `LocalesList.vue` board that verifies two contract rules: (1) each row control (edit, activate, deactivate, delete) renders **iff** the server-supplied `actions` flag for that language is `true`, and (2) clicking a control issues exactly one store call for that action — never a chained delete or side-call.

## Key elements

- **`language(tag, active, actions)`** – factory that returns a fully-populated `Language` object with the given `actions` flags (unspecified flags default to `false`).
- **`router`** – a real `vue-router` instance built from `collectModuleRoutes(enabledModules)`, so in-component links resolve against the actual route tree.
- **`mountBoard(rows)`** – mounts `LocalesList` with Pinia, Vuetify, i18n, and the router; stubs `store.fetchLanguages` / `store.fetchApps` to no-ops so the board renders from `store.capabilities` synchronously.
- **`control(wrapper, tag, hook)`** – CSS-attribute selector helper: `[data-language={tag}] [data-test={hook}]`.
- **`beforeEach`** – resets to a fresh Pinia instance and loads the `en` locale.
- **`describe` blocks** – four groups: flag→visibility mapping, activate/deactivate isolation, delete-with-confirm (including the "is live" wording on active rows), and edit-flow (fetch-by-tag, 412 "moved" reload, re-fetch on reload click).

## Relationships

- **`src/modules/locales/views/LocalesList.vue`** – the SUT; mounted directly and its rendered DOM is asserted via data-attributes.
- **`src/modules/locales/store.ts`** – `useLocalesStore` is instantiated per test; methods `fetchLanguages`, `fetchApps`, `fetchLanguage`, `editLanguage`, `deactivateLanguage`, `removeLanguage` are spied on to assert call-count and arguments.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register module side-effects needed by the router/store graph before any test runs.
- **`tests/support/unit/fixtures.ts`** – `aProblem(412, …)` produces the `PRECONDITION_FAILED` error object used to simulate the edit-rejection path.

## Notes

- The design intent is stated in the module-level JSDoc: *"each control is shown exactly when its flag is true, and switching a language on or off is its own call, never chained into a delete."* Tests are written to enforce that sentence literally.
- `wireModulesIntoCore()` is a **side-effect import** executed at module-evaluation time (not inside `beforeEach`), so the module registry is populated before Vitest collects tests.
- The edit-flow test relies on `document.querySelector` (not `wrapper.find`) to locate the rendered form and reload button, because those elements live inside a Vuetify dialog that `@vue/test-utils` may not expose through the wrapper tree.
- The router is the **real** module route tree, not a stub; this means any route-path changes in `enabledModules` can break this spec's link-resolution without changing the component under test.
