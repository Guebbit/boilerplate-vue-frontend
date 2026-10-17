---
source: src/modules/users/tests/user-create-view.spec.ts
sha256: 1f60e968038fb2492cf75111dc3873e9dab014eea574b4193ac96f8a71ecdbe9
generated_at: 2026-10-17T01:48:17.683777+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-create-view.spec.ts

## Purpose

Unit-test suite for the admin **UserCreate** view. It mounts the real page against a real memory-history router and a spied `createUser` store action, then asserts the full behavioral contract: client-side validation, the exact outgoing payload, post-success navigation, error handling (both field-level and form-level), role-permission gating, and submit-button locking during an in-flight request.

## Key elements

- **`mountPage()`** — Spies on `useUsersStore().createUser` *before* mounting `UserCreate`, then returns `{ wrapper, create }`. The spy-must-precede-mount ordering matters because the view destructures the action during `setup()`.
- **`fillAndSubmit(wrapper, fields)`** — Locates the `input` inside `[data-test=user-email]` / `[data-test=user-username]` wrappers, sets values, triggers `form` submit, and flushes promises.
- **Router (module-level)** — A `createMemoryHistory` router whose single `/:locale` route wraps `RouterView` over `collectModuleRoutes(enabledModules)`, so a successful create actually navigates.
- **`beforeEach`** — Resets Pinia, seeds `useSessionStore().grantableRoles`, loads the `en` locale, and pushes `/en/users/create` + `router.isReady()`.
- **`describe('UserCreate')`** — Twelve `it` blocks covering: active-switch default, active toggle in payload, email validation, exact-payload + navigation, absence of password/setup-email fields, API refusal (500), submit-button disable while in flight, field-level 422 error routing, role-options filtering, and hidden role field for zero-role callers.

## Relationships

- **`src/modules/users/views/UserCreate.vue`** — The component under test; imported and mounted directly.
- **`src/modules/users/store.ts`** — `useUsersStore()` is called to obtain the store instance whose `createUser` action is spied/mocked in every test.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module top-level before any test runs, ensuring the module registry is populated for `collectModuleRoutes`.
- **`tests/support/unit/fixtures.ts`** — Provides the `aUser` factory used to shape mock resolved values for `createUser`.

## Notes

- The spy **must** be created before `mount()`; the view destructures `createUser` in its `setup()` and will not see a spy attached afterward.
- `data-test` attributes land on Vuetify's outer wrapper element, not the native `<input>`. All interactions therefore target `[data-test=…] input`.
- The "disables submit while in flight" test documents a Vuetify 4.1.5 regression where `:loading` alone did not prevent a second click; `FormCard` now also binds `:disabled="loading"`.
- The role-options test asserts the exact `items` array shape including the empty-value "No staff role (customer)" entry, which is a UI convention rather than a server field.
- The suite relies on a real router for navigation assertions; it does not mock `vue-router`. This means `router.currentRoute` reflects the post-redirect URL after a successful create.
