---
source: src/modules/account/tests/oauth-callback-view.spec.ts
sha256: c7e3b082b61a38ce42f8592e94bda99b41366841d707badea835cfdd13dcb795
signature: c767855dff3ea457109df7994fbc2b89c20d5de82ff37645123143b9faeee193
generated_at: 2026-11-10T03:35:21.990286+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth-callback-view.spec.ts

## Purpose

Unit-test suite for the `OAuthCallback.vue` landing page. It verifies the three decision paths the view takes after a backend OAuth redirect—successful provider link, account in deletion grace, and backend error codes—asserting the correct toast, store mutation, and navigation without exercising real routing or network calls.

## Key elements

- **`query`** (module-level `let`): mutable stand-in for `route.query`; each test assigns it before mounting so the mocked `useRoute` returns the right params.
- **`redirectAfterLogin`**, **`addMessage`**, **`push`** (spies): the three observable side-effects the view is expected to trigger (post-login redirect, notification toast, router push).
- **`mountPage()`**: thin wrapper around `mount(OAuthCallback, …)` with Vuetify and i18n plugins registered.
- **`beforeEach`**: resets Pinia, clears mocks, resets `query` to `{}`, and loads the `en` locale so string assertions are deterministic.
- **`describe('… a connected provider')`**: asserts toast text + single `redirectAfterLogin` call when `query.linked` / `query.continue` are present.
- **`describe('… an account in its deletion grace')`**: asserts the `deletion-restore` store is populated with `purgeAt`/`expiresAt`, navigation goes to the `AccountRestoreChallenge` route, and the ordinary redirect is *not* called; second case confirms a missing `expiresAt` falls through to the normal landing.
- **`describe('… the refusals')`**: parameterized over `account_exists`, `already_linked`, `link_expired`; asserts the rendered text contains the expected phrasing and no redirect occurs.

## Relationships

- **`src/modules/account/views/OAuthCallback.vue`** — the SUT; mounted and driven entirely through the mocked router query.
- **`src/modules/account/stores/deletion-restore.ts`** — `useAccountDeletionRestoreStore().pending` is read in the deletion-grace tests to confirm the view persisted the redirect dates.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register shared test fixtures before any describe block runs.

## Notes

- `push` is created inside `vi.hoisted(…)` so it is available both in the `vi.mock('vue-router')` factory (which executes before the module body) and in assertions.
- Toast assertions match exact English strings; the `loadLocale('en')` in `beforeEach` is what makes them stable. Changing the locale or the copy in the view will break the tests.
- The `@guebbit/vue-toolkit` mock spreads the original module (`importOriginal`) and overrides only `useNotificationsStore`, so other toolkit exports remain functional during the mount.
