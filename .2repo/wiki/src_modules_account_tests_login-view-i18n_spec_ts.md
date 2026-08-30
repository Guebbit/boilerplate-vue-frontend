# src/modules/account/tests/login-view-i18n.spec.ts

## Purpose

End-to-end integration test that proves the `Login.vue` view is genuinely wired to `usersSchema` and vue-i18n's `revalidateOn: locale`. It mounts the real component, triggers validation with a real schema parse, and asserts that rendered `v-text-field` error text re-translates when the locale switches mid-form — without mocking vue-i18n or the schema.

## Key elements

- **`wireModulesIntoCore()`** (called at module top-level) — injects the account and users locale dictionaries into the shared `i18n` instance so that `t()` resolves real translations rather than raw keys.
- **`emailInvalidMessage()`** — calls `usersSchema.safeParse` with an invalid email, filters the Zod issue for the `email` path, and returns the i18n message. Also asserts the message does not contain a raw key (`users-form.`), guarding against un-loaded dictionaries that would make all assertions vacuously true.
- **`mountLogin()`** — mounts `Login.vue` with `createPinia()`, `vuetify`, and `i18n` plugins; stubs `LayoutDefault` and `vue-router` (`RouterLink`, `useRoute`, `useRouter`).
- **`errorTexts(wrapper)`** — collects the text of all `.v-messages__message` nodes currently in the DOM.
- **Test: "re-translates a displayed validation error"** — sets an invalid email, submits, confirms the English message is rendered, switches to `it`, then asserts the Italian message is present *and* the English one is gone.
- **Test: "does not put errors on a pristine form just because the language changed"** — mounts the form, switches locale, and asserts no `.v-messages__message` nodes exist.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, which is invoked once at module scope before any test runs. It is the mechanism that registers the account/users locale JSON into the global `i18n` instance; without it, every `t()` call would return the key string and all assertions would trivially pass.

## Notes

- The expected error text is derived by parsing with `usersSchema` (imported from the `@/modules/users` barrel), **not** by reading the locale JSON files directly. This ensures the assertion compares rendered output against what the schema actually produces, and respects module boundaries (a sibling's dictionary file is an internal detail).
- vue-i18n is deliberately **not** mocked. A stubbed `t` that echoes its key would make English and Italian outputs identical, collapsing the assertion.
- The second half of the language-switch test asserts the old English text is *absent*, not just that the Italian text is present. A view that renders both messages simultaneously would pass a "contains Italian" check alone.
- `loadLocale` is called in both `beforeEach` and `afterEach` (resetting to `'en'`) to prevent locale state leaking between tests.
