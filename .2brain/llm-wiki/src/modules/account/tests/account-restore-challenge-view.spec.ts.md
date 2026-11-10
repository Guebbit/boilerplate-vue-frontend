---
source: src/modules/account/tests/account-restore-challenge-view.spec.ts
sha256: 72b56791a7e83280f6429a9f15cfaa1212ae55cddfc38b0db3b548aed5ec0ebe
signature: 342a194870e7dada40ce7ee3503f4c97deb3ab35b6e44f91c4e2562afc98e582
generated_at: 2026-11-10T03:29:04.286259+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/account-restore-challenge-view.spec.ts

## Purpose

Vitest unit test for the `AccountRestoreChallenge.vue` view. Verifies the five visitor flows on the restore-offer page: displaying the scheduled erasure date, restoring through the store and redirecting post-login, showing an inline error when the claim is refused, discarding the offer and navigating Home when the visitor walks away, and redirecting to `Login` when no offer is pending.

## Key elements

- **`wireModulesIntoCore()`** — called once at module scope to register module wiring required by the app's composition API before any test runs.
- **Hoisted mocks (`push`, `replace`, `redirectAfterLogin`)** — shared `vi.fn()` instances created inside `vi.hoisted` so the `vue-router` and `use-post-login-redirect` mocks reference the same spies that assertions inspect.
- **`vi.mock('vue-router')`** — stubs `useRoute` (empty `query`) and `useRouter` (returns the hoisted `push`/`replace`).
- **`vi.mock('../composables/use-post-login-redirect.ts')`** — stubs `usePostLoginRedirect` to expose the hoisted `redirectAfterLogin` spy.
- **`mountPage(offer = true)`** — helper that optionally seeds the restore store via `beginOAuth({ purgeAt, expiresAt })` and mounts the component with `vuetify` and `i18n` plugins.
- **`beforeEach`** — resets Pinia, clears all mocks, sets resolved return values on `push`/`redirectAfterLogin`, and loads the `en` locale.
- **Five `it` blocks** covering: date display, successful restore + redirect, 401 refusal showing an inline error, "leave it deleted" clearing `pending` and pushing to `Home`, and no-offer redirect to `Login`.

## Relationships

- **`src/modules/account/views/AccountRestoreChallenge.vue`** — the component under test; imported and mounted via `@vue/test-utils`.
- **`src/modules/account/stores/deletion-restore.ts`** — provides `useAccountDeletionRestoreStore`; tests call `beginOAuth` to seed state, spy on `restoreAndSignIn`, and assert on `.pending`.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, a one-time setup call that ensures shared module registrations are in place before the component's dependencies resolve.

## Notes

- `wireModulesIntoCore()` runs once at import time, not inside `beforeEach`; adding tests that depend on it don't need to call it again.
- The "no offer" test does not interact with any button — it asserts that the component itself calls `router.replace` to `Login` on mount when the store has no pending offer.
- Element queries use `data-test` attributes (e.g. `account-restore-challenge-restore`, `account-restore-challenge-leave`, `account-restore-challenge-error`), not CSS classes.
- The refusal test simulates a 401 with a structured `errors` array; the component is expected to surface the `message` string rather than navigating.
