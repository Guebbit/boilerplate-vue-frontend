---
source: src/modules/users/tests/schemas-i18n.spec.ts
sha256: 93fb678a482f20aa6ff281983ae7e88680a27b25bc78f75c93bf14617010fa59
signature: bbcc893b40cb9ae94067bb67ce46b22e62b79e1e5cd573f7698feff4e15fbe0e
generated_at: 2026-11-10T06:07:00.867281+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/schemas-i18n.spec.ts

## Purpose

Proves that the users module's Zod schemas resolve their validation messages into the active locale (English → Italian) using the **real** vue-i18n instance. The general mechanism (thunked Zod messages re-resolve at parse time) is covered by a cross-cutting test with an invented schema; this file verifies that *this module's* schemas and locale dictionaries actually agree.

## Key elements

- **`setLocale(locale)`** — Calls `loadLocale(locale)` then `nextTick()` so Vue reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — Runs `schema.safeParse(value)` and returns the array of `issue.message` strings (empty array on success).
- **`describe('users schema messages')`** — Two tests:
  - Asserts `usersSchema` produces the English `email-invalid` message, then switches to Italian and asserts the Italian `email-invalid` message from the *same* schema object.
  - Asserts `usersPasswordSchema` produces the Italian `password-min` / `password-max` messages for short and long inputs.

## Relationships

- **`src/modules/users/schemas.ts`** — Source of `usersSchema` and `usersPasswordSchema`, the objects under test.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called in `beforeAll` to register module locale dictionaries into the core i18n instance.

## Notes

- **No mocked `t`.** A mock would only prove a key was *looked up*; the tests assert the resolved *string* matches the JSON dictionary, catching a frozen/wrong-language message.
- The cross-cutting mechanism test lives at `tests/cross-cutting/schemas-i18n.spec.ts` (referenced in the file header, not a graph neighbor here).
- `afterEach` resets the locale to `'en'` to avoid cross-test contamination.
- Locale JSON files (`../locales/en.json`, `../locales/it.json`) are imported directly to supply expected values, coupling the test to the dictionary shape.
