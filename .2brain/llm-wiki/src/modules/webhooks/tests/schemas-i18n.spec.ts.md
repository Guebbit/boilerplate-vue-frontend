---
source: src/modules/webhooks/tests/schemas-i18n.spec.ts
sha256: 857f4b0226048a2a45ce3824b1a4b83750959decad7d20385b349ae52c2e91a1
generated_at: 2026-10-17T01:51:44.624386+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/schemas-i18n.spec.ts

## Purpose

Domain-level i18n test for the webhooks module: it proves that `webhookCreateSchema`'s Zod error messages actually resolve to the correct localized strings (from the module's own locale dictionaries) when the active locale changes. It runs against the **real** vue-i18n instance so that a silently frozen or wrong-language message would be caught — something a mocked `t` cannot detect. The generic *mechanism* proof (thunked messages re-resolve at parse time) lives in `tests/cross-cutting/schemas-i18n.spec.ts`; this file only checks that *this* module's schema and dictionaries agree.

## Key elements

- **`setLocale(locale)`** — switches the active i18n locale via `loadLocale` and awaits a Vue `nextTick` so DOM-facing reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — runs `schema.safeParse(value)` and returns the array of `message` strings from any parse issues; returns `[]` on success.
- **`describe('webhooks schema messages')`** — three tests:
  - *url-invalid*: asserts the message equals `enMessages['webhooks-form']['url-invalid']` in English, then re-parses the same invalid value after switching to Italian and asserts it equals `itMessages['webhooks-form']['url-invalid']`.
  - *url-must-be-https*: asserts the HTTP (non-HTTPS) URL triggers the `url-must-be-https` message in English.
  - *event-types-required*: switches to Italian, then asserts an empty `eventTypes` array triggers the `event-types-required` message from `itMessages`.

## Relationships

- **`src/modules/webhooks/schemas.ts`** — supplies `webhookCreateSchema`, the Zod schema under test.
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore()`, called in `beforeAll` to register the webhooks locale messages with the i18n core exactly as `src/main.ts` does in the app.
- **`src/modules/webhooks/locales/en.json` / `it.json`** — imported directly to form the expected assertion values, ensuring the test checks the *actual string content*, not just a key lookup.
- **`@/i18n` (`loadLocale`)** — the real i18n runtime used to switch locales at runtime.

## Notes

- The doc comment explicitly states *why* the real i18n instance is required: a mocked `t` would only prove a key was requested, which stays true even when the resolved message is in the wrong language.
- `messagesOf` is typed against a structural subset of the Zod API (`{ safeParse }`) rather than importing `z.ZodSchema`, keeping the helper dependency-free.
- `afterEach` resets the locale back to `'en'` so test order does not leak locale state.
- The cross-cutting counterpart (`tests/cross-cutting/schemas-i18n.spec.ts`) is referenced only in the doc comment; there is no import or runtime dependency between the two files.
