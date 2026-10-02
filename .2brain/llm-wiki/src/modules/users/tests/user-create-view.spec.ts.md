---
source: src/modules/users/tests/user-create-view.spec.ts
sha256: 90a3810c43185aa20ee7c6238c20dc870b84088948de3649a1f7dbed8c0cebf5
generated_at: 2026-10-02T15:49:20.754458+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-create-view.spec.ts

## Purpose

Integration-level test suite for the `UserCreate` admin page. It mounts the real component against a real (memory-history) router and verifies: client-side validation refusal, the exact payload dispatched to the store, post-creation navigation, in-place blocking on API rejection, submit-button locking during in-flight requests, and field-level error placement vs. the banner. `createUser` is spied at the Pinia store so no network call is made.

## Key elements

- **`router`** – A `createRouter` instance with `createMemoryHistory`, carrying the real module routes (via `collectModuleRoutes(enabledModules)`). Success navigation is exercised for real.
- **`mountPage()`** – Spies `useUsersStore().createUser` *before* calling `mount(UserCreate, …)`, then returns `{ wrapper, create }`. The spy timing matters because the view destructures the action during `setup()`.
- **`fillAndSubmit(wrapper, fields)`** – Chained `.then()` helper that sets the three required inputs (email, username, password) and triggers a form submit, followed by `flushPromises`.
- **`GOOD_PASSWORD`** – Constant (`'Str0ng-Enough-Pass!'`) that satisfies the shared password-composition rule.
- **`beforeEach`** – Resets Pinia, loads the `en` locale, pushes `/en/users/create` on the router, and awaits `router.isReady()`.
- **Seven `it` blocks** covering: invalid email → no send; happy-path payload + navigation to `/en/users/u-new`; missing password + no setup-email → client-side refusal; setup-email checked → blank password accepted; API 500 → banner shown, stay on page; in-flight → submit button `disabled`; API 422 with `field: 'email'` → message on that field, not the banner.

## Relationships

- **`tests/support/unit/fixtures.ts`** – Provides the `aUser` factory used to shape the mock resolved value in the happy-path and setup-email tests.
- **`tests/support/unit/wire-modules.ts`** – Exposes `wireModulesIntoCore()`, called at module top-level so that `collectModuleRoutes(enabledModules)` and the router see fully-registered module routes before the suite runs.

## Notes

- The spy must be attached **before** `mount`; the view destructures `createUser` once at setup, so a later spy would not intercept the reference.
- Vuetify places `data-test` on the wrapper element, not the native `<input>`. All selectors use the `[data-test=…] input` pattern to reach the value-bearing element.
- The success-navigation assertion uses `vi.waitFor` with a throwing guard inside, because a single `flushPromises` may not be enough for the router to commit the navigation.
- The FA52 test documents a Vuetify 4.1.5 regression where `:loading` alone did not disable the button; `FormCard` now also binds `:disabled="loading"`, and this test locks that behaviour in.
- The U2 test encodes a backend contract (422 when neither `password` nor `sendSetupEmail: true` is present) as a *client-side* requirement: the form must refuse before the round-trip.
