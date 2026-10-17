---
source: src/modules/users/tests/schemas-i18n.spec.ts
sha256: 93fb678a482f20aa6ff281983ae7e88680a27b25bc78f75c93bf14617010fa59
generated_at: 2026-10-17T01:47:28.358864+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/schemas-i18n.spec.ts

## Purpose

Verifies that the users module's Zod schemas resolve validation messages in the active locale (English → Italian) at parse time. It lives with the domain (not in the cross-cutting i18n suite) because it asserts *these specific schemas and their locale dictionaries agree*, whereas the mechanism of thunked-message re-resolution is proven once with an invented schema elsewhere.

## Key elements

- **`setLocale(locale)`** – Calls `loadLocale` then `nextTick()` so DOM-facing reactivity settles before assertions run.
- **`messagesOf(schema, value)`** – Runs `schema.safeParse(value)` and returns the array of `issue.message` strings (empty if no error). Typed structurally (duck-typed) rather than importing Zod types.
- **`describe('users schema messages')`** – Two tests:
  - Resolves `usersSchema` email/username errors in EN, then re-parses the *same object* after switching to IT and asserts the Italian string from `itMessages`.
  - Resolves `usersPasswordSchema` min/max length messages in IT.

## Relationships

- **`src/modules/users/schemas.ts`** – Supplies `usersSchema` and `usersPasswordSchema`, the objects under test.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, which registers all module locale dictionaries into the real vue-i18n core exactly as `src/main.ts` does, so the tests exercise the production wiring path.

## Notes

- Tests run against the **real** vue-i18n instance. A mocked `t` would only prove a key was looked up, which stays true even if the message is frozen in the wrong language.
- Assertions use `expect.arrayContaining`, not strict equality, because a single parse can surface multiple issues (e.g. both email and username in one call).
- `afterEach` resets locale back to `'en'` to avoid cross-test leakage.
- The cross-cutting mechanism proof lives in `tests/cross-cutting/schemas-i18n.spec.ts` (invented schema); do not duplicate that concern here.
