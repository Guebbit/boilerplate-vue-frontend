---
source: src/modules/products/tests/schemas-i18n.spec.ts
sha256: 4ac45eae03708cd2e0f1da50aa3e97ffe7dab8194cd3edfcf657ed35b60c90de
generated_at: 2026-10-17T01:33:57.568003+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/schemas-i18n.spec.ts

## Purpose

Verifies that every message key the products Zod schemas reference actually exists in both `en` and `it` locale dictionaries and resolves to different text. It runs against the **real** vue-i18n instance (not a mocked `t`) so the assertion proves genuine locale resolution rather than mere key lookup. This complements the cross-cutting test in `tests/cross-cutting/schemas-i18n.spec.ts`, which proves the thunk-re-resolution mechanism in isolation with an invented schema; this file proves *this module's* schemas and dictionaries agree.

## Key elements

- **`setLocale(locale)`** — Calls `loadLocale` from `@/i18n`, then awaits `nextTick()` so DOM-facing reactivity settles before the next assertion.
- **`messagesOf(schema, value)`** — Calls `schema.safeParse(value)` and returns the flat array of issue messages for the active locale. Accepts a structural `{ safeParse }` type rather than a full Zod type, keeping the helper loosely coupled.
- **`beforeAll`** — Wires all modules into the i18n core via `wireModulesIntoCore()` and sets the locale to `'en'`.
- **`afterEach`** — Resets the locale to `'en'` to prevent cross-test leakage.
- **`it('resolves in English, then in Italian, from the same schema object')`** — Parses a deliberately invalid product object, asserts the English message via `expect.arrayContaining`, then switches to `'it'` and asserts the Italian message from the *same* `productsSchema` reference.

## Relationships

- **`src/modules/products/schemas.ts`** — Source of `productsSchema`, the schema under test. The test exercises its validation messages without modifying the schema.
- **`tests/support/unit/wire-modules.ts`** — Source of `wireModulesIntoCore`, called in `beforeAll` to register all module locale entries into the live i18n core, mirroring what `src/main.ts` does at boot.

## Notes

- The test asserts with `expect.arrayContaining` (subset match) rather than strict equality, because a single invalid input can trigger multiple schema issues; only the presence of the specific i18n message is the contract under test.
- Deliberately avoids mocking the i18n `t` function: a mock would return the message for whatever key was looked up, which stays true even if the message were frozen in the wrong language. Using the real instance closes that gap.
- The file imports locale JSON (`en.json`, `it.json`) directly to construct expected values, so a typo in a dictionary key would cause a test failure rather than a silent empty string.
