# src/modules/account/tests/login-view-i18n.spec.ts

## Purpose

Integration test that proves the `Login.vue` view is genuinely wired to `usersSchema` + vue-i18n's `revalidateOn: locale`. Unlike the isolated mechanism test in `tests/cross-cutting/schemas-i18n.spec.ts`, this spec mounts the real view, triggers a form submit, and reads the rendered `v-text-field` validation text in two languages (en → it) to confirm re-translation actually happens mid-form.

## Key elements

- **`wireModulesIntoCore()`** — imported from `tests/support/unit/wire-modules.ts`; registers the modules' i18n dictionaries into the shared i18n instance so translations are resolvable at runtime.
- **`emailInvalidMessage()`** — runs `usersSchema.safeParse` with an invalid email, extracts the first `email`-path issue message, and asserts it is a translated string (not a raw key). Returns the message text for the *current* active locale.
- **`mountLogin()`** — mounts `Login.vue` with `createPinia()`, Vuetify, the real `i18n` plugin, a `LayoutDefault` stub, and a `vue-router` mock. Returns the `VueWrapper`.
- **`errorTexts(wrapper)`** — helper that collects the text of all `.v-messages__message` nodes in the rendered DOM.
- **`vi.mock('vue-router', …)`** — stubs `RouterLink`, `useRoute`, `useRouter` so the view can render without a live router. vue-i18n is deliberately **not** mocked.
- **`describe('Login view, language switched mid-form')`** — two test cases:
  1. Submits an invalid email in English, asserts the English error renders; switches to Italian, asserts the Italian error replaces the English one.
  2. Switches locale on a pristine (unsubmitted) form and asserts no validation messages appear.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level (before any `describe`) to inject the account and users modules' locale dictionaries into the i18n instance. Without this call, `emailInvalidMessage()` would return raw keys and every assertion would pass vacuously.

## Notes

- The spec reads expected error text by parsing through `usersSchema` (imported from the `@/modules/users` barrel) rather than from a locale JSON file. This was a lint-enforced convention: a sibling module's dictionary is internal; the barrel is the only sanctioned surface.
- The assertion `expect(italian).not.toBe(english)` guards against a broken i18n setup where both locales silently fall back to the same string.
- The second test (pristine form) exists to catch a regression where `revalidateOn: locale` triggers a full re-validation on a form the user never touched.
- `beforeEach`/`afterEach` both reset to `loadLocale('en')` to prevent locale bleed between tests.
