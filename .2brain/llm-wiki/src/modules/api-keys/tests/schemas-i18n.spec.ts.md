---
source: src/modules/api-keys/tests/schemas-i18n.spec.ts
sha256: e31f42cb3e410ca13b82f0b59697491352020b592f7dc15b23ed1ec48f0740b8
signature: bbcc893b40cb9ae94067bb67ce46b22e62b79e1e5cd573f7698feff4e15fbe0e
generated_at: 2026-11-10T03:51:31.561662+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/schemas-i18n.spec.ts

## Purpose

Proves that the api-keys module's Zod schema (`apiKeyCreateSchema`) resolves its validation messages to the correct localized strings for English and Italian, using the **real** vue-i18n instance. It is the module-specific counterpart to the cross-cutting test in `tests/cross-cutting/schemas-i18n.spec.ts`, which demonstrates the thunk-re-resolves-at-parse-time mechanism with an invented schema. This file confirms this module's schema and its locale dictionaries actually agree.

## Key elements

- **`setLocale(locale)`** — switches the active i18n locale via `loadLocale` and awaits `nextTick()` so Vue reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — calls `schema.safeParse(value)` and returns the array of `issue.message` strings (empty array when the parse succeeds).
- **`describe('api-keys schema messages')`** — five test cases, each asserting a specific localized message appears (via `expect.arrayContaining`) for a particular invalid input:
  - required-name (English → Italian on the *same* schema object)
  - too-long-name (201-char name)
  - permissions-required (Italian)
  - missing-expiry (`expiresAt` absent)
  - past-expiry (`expiresAt` in the past)

## Relationships

- **`src/modules/api-keys/schemas.ts`** — source of `apiKeyCreateSchema`, the Zod schema under test.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called in `beforeAll` to register the module's locale dictionaries into the shared vue-i18n core instance, so messages resolve through the real pipeline rather than a mocked `t`.

## Notes

- A mocked `t` function would only confirm that a lookup key was requested, not that the resolved string is in the right language. That is why this file insists on the real i18n instance (see header comment).
- `afterEach` resets the locale back to `en` to prevent cross-test contamination.
- Assertions use `arrayContaining` because a single input can trigger multiple validation issues simultaneously; only the relevant message is checked.
- The file is intentionally colocated with the domain module (per `docs/theory/modules.md`) rather than living in the cross-cutting test directory.
