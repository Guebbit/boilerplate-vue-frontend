---
source: src/modules/api-keys/tests/schemas-i18n.spec.ts
sha256: fb4b66857473d5dd9b3cb720d3c72d6b6a2b2e40f7ddc23653cb6afc00152429
generated_at: 2026-10-02T14:54:44.396127+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/schemas-i18n.spec.ts

## Purpose

Verifies that `apiKeyCreateSchema`'s validation messages actually resolve to the correct strings in the api-keys locale dictionaries (`en.json`, `it.json`) under a real vue-i18n runtime. It complements the cross-cutting spec (`tests/cross-cutting/schemas-i18n.spec.ts`) that proves the *mechanism* of thunked Zod messages re-resolving at parse time; this spec proves *this module's* schema and dictionaries agree.

## Key elements

- **`setLocale(locale)`** — Switches the active locale via `loadLocale` and waits one `nextTick` so reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — Runs `schema.safeParse(value)` and returns the flat array of `issue.message` strings, or `[]` if no error.
- **`describe('api-keys schema messages')`** — Four test cases asserting specific issue messages against the corresponding `en.json` / `it.json` values:
  - Required-name message (checked in both English and Italian from the *same* schema object).
  - Too-long-name message (name > 200 chars).
  - Permissions-required message (Italian).
  - Past-expiry message (`expiresAt` in the past).

## Relationships

- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` registers the api-keys locale namespace into the shared i18n core instance, mirroring what `src/main.ts` does at app startup. Required so that `loadLocale` can actually find the module's messages.
- **`@/modules/api-keys/schemas`** — Source of `apiKeyCreateSchema`, the object under test.
- **`../locales/en.json` / `../locales/it.json`** — Imported as expected-value fixtures; tests assert that schema messages match these exact strings.

## Notes

- Tests run against the **real** vue-i18n instance, not a mocked `t`. A mock would only confirm a key was looked up, not that the resolved string is in the correct language.
- `afterEach` resets the locale to `'en'` to prevent cross-test contamination.
- The required-name test switches to Italian *mid-test* and re-parses the same schema object, explicitly proving the message is not frozen at import time.
