---
source: src/modules/api-keys/tests/schemas-i18n.spec.ts
sha256: b2c149be849bc62fb0f650a02a7eed360be06b0021df509a1817cd3539f854ce
generated_at: 2026-10-17T00:32:30.081336+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/schemas-i18n.spec.ts

## Purpose

Verifies that the api-keys module's Zod validation messages resolve to the correct localized strings from the real vue-i18n instance when the active locale changes. It complements the cross-cutting test (`tests/cross-cutting/schemas-i18n.spec.ts`) that proves the general thunked-message mechanism; this file proves that *this module's* schema and locale dictionaries actually agree.

## Key elements

- **`setLocale(locale)`** — Helper that calls `loadLocale` and awaits `nextTick()`, ensuring the active locale is switched and reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — Calls `schema.safeParse(value)` and extracts the array of `issue.message` strings, returning `[]` when no error is present.
- **`beforeAll` hook** — Calls `wireModulesIntoCore()` to register the api-keys module's translations with the shared i18n instance, then sets locale to `'en'`.
- **`afterEach` hook** — Resets locale to `'en'` to prevent leakage between tests.
- **Five test cases** covering: `name-required` (asserted in both EN and IT from the same schema object), `name-too-long`, `permissions-required`, `expires-at-required` + `expires-at-too-far`, and `expires-at-past`. Each asserts that the schema's issue message equals the corresponding key in the imported `en.json` or `it.json` dictionary.

## Relationships

- **`src/modules/api-keys/schemas.ts`** — Source under test; provides `apiKeyCreateSchema`, whose thunked messages are exercised by every test case.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called in `beforeAll` to attach the api-keys module's locale bundles to the shared vue-i18n core (mirroring what `src/main.ts` does at app startup).

## Notes

- Uses the **real** vue-i18n instance (via `loadLocale`), not a mocked `t`. A mock would only confirm a key was looked up, which remains true even if the resolved string is frozen in the wrong language — the exact failure mode this test guards against.
- The file deliberately lives alongside the domain (`src/modules/api-keys/tests/`) rather than in `tests/cross-cutting/`, per the convention in `docs/theory/modules.md`: mechanism is proven once in cross-cutting; correctness of a module's dictionaries is proven with the module.
- Locale state is **global** to the i18n instance; the `afterEach` reset is essential because a test that switches to `'it'` would otherwise poison subsequent tests.
