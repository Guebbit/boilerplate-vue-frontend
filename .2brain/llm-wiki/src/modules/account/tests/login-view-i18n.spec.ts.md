---
source: src/modules/account/tests/login-view-i18n.spec.ts
sha256: a662654bfe44237df878a8b286591a4b4087d5ab785958a1ba09fdec1390ee94
signature: bc4536370542e28dcda396c4b0608e6d88cacb66db98984528dc1d8f0352f80b
generated_at: 2026-11-10T03:34:58.498964+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/login-view-i18n.spec.ts

## Purpose

Integration test that mounts the real `Login` view and verifies it is genuinely wired to `usersSchema` + vue-i18n's `revalidateOn: locale`. It renders the form, triggers validation, and asserts the displayed `v-text-field` error message changes correctly when the locale switches from English to Italian — without mocking either the schema or the i18n instance.

## Key elements

- **`emailInvalidMessage()`** — Parses `{ email: 'nope' }` with `usersSchema` in the *current* locale and returns the resulting error string. Asserts the result is not a raw i18n key (`users-form.…`), so a missing dictionary fails loudly instead of making downstream assertions vacuously true.
- **`mountLogin()`** — Mounts `Login` with `createPinia()`, `vuetify`, and the shared `i18n` instance as global plugins.
- **`errorTexts(wrapper)`** — Collects all `.v-messages__message` text nodes currently rendered in the Vuetify form.
- **`vi.mock('vue-router', …)`** — Stubs `RouterLink`, `useRoute`, `useRouter` so no real router is needed.
- **`vi.mock('@api', …)`** — Makes `getConfig` reject (simulating "offline") so the OAuth config fetch never hits the dev server.
- **`describe('Login view, language switched mid-form')`** — Two tests:
  - *re-translates a displayed validation error*: enters a bad email, submits, captures the English message, calls `loadLocale('it')`, then asserts the Italian message is present **and** the English one is gone. Also checks each message against a hardcoded literal to catch schema/locale drift.
  - *does not put errors on a pristine form just because the language changed*: switches locale on an untouched form and expects zero `.v-messages__message` nodes.

## Relationships

- **`src/modules/account/views/Login.vue`** — The component under test; mounted directly and driven through DOM interaction (`.setValue`, `.trigger('submit')`).
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called at module top-level to register locale dictionaries into the shared `i18n` instance before any test runs. Without it, every `t()` call would return the key itself.

## Notes

- vue-i18n is **deliberately not mocked**. A `t` stub that echoes its key would make both locales render identical strings, turning the core assertion meaningless.
- Expected messages are derived by calling `usersSchema.safeParse(…)` rather than reading `users/locales/*.json` directly. Lint enforces this: a sibling module's locale file is an internal detail; the barrel (`@/modules/users`) is the only surface `account` may touch.
- The English-message assertion checks **both** the schema-derived value *and* a hardcoded literal string, so a silent drift between the schema message and the locale JSON is caught.
- The "Italian present / English absent" pair of assertions guards against a field that renders both languages stacked.
