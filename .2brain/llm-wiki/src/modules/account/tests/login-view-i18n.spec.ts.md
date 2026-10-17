---
source: src/modules/account/tests/login-view-i18n.spec.ts
sha256: 33f5e8c33a1163559579f91d5585e1ad459643533bac48dc92ecad58ae631750
generated_at: 2026-10-17T00:22:27.309090+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/login-view-i18n.spec.ts

## Purpose

End-to-end view test that the `Login.vue` form re-translates Vuetify validation messages when the active locale changes mid-form. It exists to catch a specific regression: a view that forgets `revalidateOn: locale` on its `v-text-field` renders correctly in one language but shows stale (or both) messages after switching. Unlike `tests/cross-cutting/schemas-i18n.spec.ts` (which proves the mechanism in isolation), this spec proves the *wiring* inside a real mounted component.

## Key elements

- **`wireModulesIntoCore()`** (called at module top level) — loads locale dictionaries into the shared `i18n` instance so that `t()` resolves real translations rather than raw keys.
- **`emailInvalidMessage()`** — runs `usersSchema.safeParse({ email: 'nope', username: 'ada' })` and extracts the `email` issue message in the *current* locale. Also asserts the result is not a raw `users-form.*` key (guards against unloaded dictionaries).
- **`mountLogin()`** — mounts `Login.vue` with `createPinia()`, `vuetify`, and `i18n` as global plugins.
- **`errorTexts(wrapper)`** — reads all `.v-messages__message` node texts from the wrapper.
- **`vi.mock('vue-router', …)`** — stubs `RouterLink`, `useRoute`, and `useRouter` so the view can mount without a live router.
- **`describe('Login view, language switched mid-form')`** — two cases:
  1. Submits an invalid email in English, verifies the English message renders, switches to Italian, then asserts the Italian message is present *and* the English one is gone.
  2. Switches locale on a pristine (never-submitted) form and asserts no error text appears.

## Relationships

- **`src/modules/account/views/Login.vue`** — the component under test; this spec mounts it, sets a value on its email input, triggers form submit, and inspects its rendered Vuetify messages.
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore()`, which registers the account/users locale JSON files into the `i18n` instance. Without this call every `t()` key would render as a literal string and all assertions would be vacuous.

## Notes

- vue-i18n is **not** mocked. A stubbed `t` that echoes its key would make English and Italian identical, rendering the re-translation assertion meaningless.
- Expected messages are derived via `usersSchema.safeParse` (the public barrel) rather than by reading `users/locales/*.json` directly. The file's comments explain this is both a lint-driven constraint (sibling internals aren't importable) and a stronger assertion (it validates the schema's actual output, not a file that might not be the one loaded).
- Both halves of the switch-language assertion matter: the new-locale text must be present **and** the old-locale text must be absent. Asserting only presence would pass on a field that renders both messages stacked.
- `beforeEach` / `afterEach` reset the locale to `'en'` so tests don't leak state.
