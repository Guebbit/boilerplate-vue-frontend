---
source: src/modules/users/tests/user-create-view.spec.ts
sha256: 60c40ce55a62abb013820221d72432b9b7252484c38b522cd2dc4834048ed53d
signature: 74a1a32ac400d4ebd59ad6ee593212fa5e541d20f55d70836ec2ec6af65085e6
generated_at: 2026-11-10T06:08:16.402108+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-create-view.spec.ts

## Purpose

Integration test for the admin "Create User" page (`UserCreate.vue`). It mounts the real component against a real memory-history router and a real Pinia store (with `createUser` spied), verifying: client-side validation, the exact payload shape sent, success navigation to the new user, API-rejection handling, role-assignment restrictions, and submit-button disabling during an in-flight request.

## Key elements

- **`router`** (module-level const) — `createRouter` with `createMemoryHistory`, routes built from `collectModuleRoutes(enabledModules)` under `/:locale`. Used so success navigation resolves a real lazy route.
- **`mountPage()`** — Spies `useUsersStore().createUser` *before* mounting (the view destructures it in `setup`), then mounts `UserCreate` with the router, Vuetify, and i18n plugins. Returns `{ wrapper, create }`.
- **`fillAndSubmit(wrapper, { email, username })`** — Sequentially sets values on the two required inputs (targeting the inner `<input>` because `data-test` lands on Vuetify's wrapper element), triggers `form` submit, and flushes promises.
- **`beforeEach`** — Resets Pinia, sets `useSessionStore().grantableRoles`, loads the `en` locale, and navigates to `/en/users/create`.
- **`afterEach`** — Pushes the router back to `/en/users/create` to supersede any still-resolving lazy-route navigation that would otherwise land after teardown (`history is not defined`).
- **`describe('UserCreate', …)`** — 11 test cases covering: default `active` state; toggling `active`; invalid-email rejection; exact payload + navigation target; absence of password/setup-email fields; absence of those keys in the payload; API 500 blocks the form in place; submit button disabled while request is in flight; field-level error placement (not banner); role-select items reflect `grantableRoles`; role field hidden when `grantableRoles` is empty.

## Relationships

- **`src/modules/users/store.ts`** — The sole external behavior under test; `createUser` is spied and its call-args / resolved / rejected values drive every assertion.
- **`src/modules/users/views/UserCreate.vue`** — The component under test, mounted directly (not via a parent layout).
- **`tests/support/unit/fixtures.ts`** — Provides `aUser()` and `aProblem()` factories used to shape mock responses.
- **`tests/support/unit/wire-modules.ts`** — Called once at module top (`wireModulesIntoCore()`) to register module routes/dependencies so `collectModuleRoutes` and the router resolve correctly.

## Notes

- **Spy-before-mount is load-bearing.** `UserCreate` destructures `createUser` during `setup`; spying after mount would leave the original reference captured.
- **`data-test` selectors require a child combinator** (e.g. `[data-test=user-email] input`) because Vuetify places the attribute on a wrapper element, not the `<input>` itself.
- **`afterEach` router push is a teardown guard**, not a reset. The lazy route component resolved by a success navigation can still be loading when the test body returns; without this, the promise resolves after the jsdom environment is torn down.
- The "disables the submit button" test exists because of a Vuetify 4.1.5 issue where `:loading` alone does not set the HTML `disabled` attribute; `FormCard` now also binds `:disabled="loading"`.
- Role-select assertions use `findAllComponents({ name: 'VSelect' })` rather than a `v-select` tag selector, since Vuetify 4 renders the component differently.
