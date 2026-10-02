---
source: src/modules/webhooks/tests/schemas-i18n.spec.ts
sha256: 775ef7a670a450230125eeff65785cf6369f4ff68703c375b57c4b99d076251f
generated_at: 2026-10-02T15:55:17.921598+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/schemas-i18n.spec.ts

## Purpose

Domain-level i18n test proving that the webhooks module's Zod validation schemas produce locale-correct error messages at parse time. Unlike the cross-cutting test in `tests/cross-cutting/schemas-i18n.spec.ts` (which proves the *mechanism* of thunked Zod messages with an invented schema), this file asserts that *this module's* schemas and locale dictionaries actually agree.

## Key elements

- **`setLocale(locale)`** — Helper that calls `loadLocale(locale)` and then `nextTick()`, ensuring the active locale is settled before assertions run.
- **`messagesOf(schema, value)`** — Runs `schema.safeParse(value)` and extracts the array of issue messages (empty array on success).
- **`describe('webhooks schema messages')`** — The test suite. `beforeAll` wires modules into the i18n core and sets locale to `'en'`; `afterEach` resets to `'en'`.
  - *url message EN → IT*: Asserts `webhookCreateSchema` rejects a non-URL with the English `url-invalid` message, then re-parses after switching to Italian and expects the Italian `url-invalid` message — from the **same** schema object.
  - *https-only message*: Asserts an `http://` URL triggers the `url-must-be-https` message (English).
  - *event-types message*: Switches to Italian and asserts an empty `eventTypes` array triggers the Italian `event-types-required` message.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called in `beforeAll` to register all module locale dictionaries into the core vue-i18n instance (mirroring what `src/main.ts` does in the app). Without this call, the locale keys under test would not exist in the i18n runtime.

## Notes

- Deliberately uses the **real** vue-i18n instance rather than a mocked `t`. A mock would only confirm a key was looked up, which would still pass even if the message were frozen in the wrong language — exactly the regression this file guards against.
- Locale state is mutated between assertions within a single `it` block (EN → IT), relying on the schema's thunked message re-resolving at `safeParse` time. This is the behavioral contract under test.
- Locale JSON files (`en.json`, `it.json`) are imported directly so the test asserts against the *same* string literals the app ships, not a hardcoded expectation.
