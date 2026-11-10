---
source: src/modules/webhooks/tests/schemas-i18n.spec.ts
sha256: 857f4b0226048a2a45ce3824b1a4b83750959decad7d20385b349ae52c2e91a1
signature: bbcc893b40cb9ae94067bb67ce46b22e62b79e1e5cd573f7698feff4e15fbe0e
generated_at: 2026-11-10T06:15:16.818726+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/schemas-i18n.spec.ts

## Purpose

Proves that `webhookCreateSchema`'s Zod error messages re-resolve against the **active** locale at parse time, using the module's own `en.json` / `it.json` dictionaries. It complements the generic mechanism test in `tests/cross-cutting/schemas-i18n.spec.ts` (which uses an invented schema) by verifying this specific schema and dictionary pair actually agree.

## Key elements

- **`setLocale(locale)`** – Calls `loadLocale` and chains `nextTick()` so Vue reactivity settles before assertions run.
- **`messagesOf(schema, value)`** – Runs `safeParse` and returns the flat array of `issue.message` strings (or `[]` on success).
- **`describe('webhooks schema messages')`** – Test suite with:
  - `beforeAll` – Wires i18n modules and sets locale to `'en'`.
  - `afterEach` – Resets locale to `'en'` to prevent cross-test leakage.
  - *"resolves the url message in English, then in Italian, from the same schema object"* – Switches locale mid-test to prove the message is not frozen at import time.
  - *"resolves the https-only message"* – Asserts the `url-must-be-https` key appears.
  - *"resolves the event-types message"* – Asserts the `event-types-required` key in Italian.

## Relationships

- **`src/modules/webhooks/schemas.ts`** – Source of `webhookCreateSchema`, the object under test.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore`, which registers the module's locale messages with the real vue-i18n instance so tests exercise the same lookup path as production.

## Notes

- Tests import the raw locale JSONs (`en.json`, `it.json`) and compare against `enMessages['webhooks-form'][…]` rather than hardcoding English/Italian strings, so a dictionary edit breaks the test automatically.
- A **real** vue-i18n instance is used (no mocked `t`); the header comment explains that a mock would only assert a key lookup, which stays green even when the message is frozen in the wrong language.
- `afterEach` resets to `'en'` because Vitest runs `beforeAll` only once per suite; without the reset, a test that ends in Italian would poison the next test.
