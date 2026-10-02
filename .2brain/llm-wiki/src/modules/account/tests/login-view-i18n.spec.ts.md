---
source: src/modules/account/tests/login-view-i18n.spec.ts
sha256: e9838b993a83841e1307c9daf522035bac0a5e3e4d21f9c3d3013c6a116ff57d
generated_at: 2026-10-02T12:24:54.823176+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/login-view-i18n.spec.ts

## Purpose
End-to-end view test that the `Login` component is actually wired to `usersSchema` and vue-i18n's `revalidateOn: locale`. It renders the real view, triggers a validation error, switches locale mid-form, and asserts the on-screen Vuetify message re-translates — with no mocking of the i18n runtime or the schema.

## Key elements
- **`wireModulesIntoCore()`** (called at module scope) — registers module locale dictionaries into the shared `i18n` instance so keys resolve to real strings.
- **`emailInvalidMessage()`** — parses `{ email: 'nope' }` through `usersSchema`, extracts the email issue message, and asserts it is not a raw `users-form.` key (guards against a silent "dictionaries never loaded" state).
- **`mountLogin()`** — mounts `Login.vue` with Pinia, Vuetify, i18n, and a `LayoutDefault` stub.
- **`errorTexts(wrapper)`** — reads all `.v-messages__message` node texts from a mounted wrapper.
- **`vi.mock('vue-router', …)`** — replaces `RouterLink`, `useRoute`, `useRouter` with minimal stubs so the view can mount without a real router.
- **Test: "re-translates a displayed validation error"** — types an invalid email, submits, captures the English message, calls `loadLocale('it')`, and asserts the Italian text appears *and* the English text is gone.
- **Test: "does not put errors on a pristine form just because the language changed"** — switches locale on a fresh mount and asserts zero validation messages.

## Relationships
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, which injects `users` module locale JSON into the shared i18n instance. Without this call every key in the test would render as its literal dot-path string, making all assertions vacuously compare a key to itself.

## Notes
- vue-i18n is deliberately **not** mocked. A `t` that returns its key would make "English" and "Italian" identical and the core assertion meaningless.
- Expected copy is derived by parsing through `usersSchema` (imported from the `@/modules/users` barrel), not by reading `users/locales/*.json` directly — the latter is a sibling module's internal and lint rejects cross-module access to it.
- The test also hardcodes the literal English and Italian strings as a secondary check: if `users-form.email-invalid` drifts in the JSON without the schema message changing, the schema-derived helper would still pass but the literal comparison would fail.
- Both halves of the re-translation assertion matter: the new language's text must be present **and** the old language's text must be absent. A one-sided assertion would pass on a field that renders both messages simultaneously.
