---
source: src/modules/example/tests/schemas-i18n.spec.ts
sha256: a52268b6917c1dbd7e26f7d4dde5bf5e576a252a5cf3a3d56d7d6138fc576d2c
signature: 806540c09b85ed11fa36be86294b8a4ea815b67bf6e129f3e0c081ea5b4ef297
generated_at: 2026-11-10T04:27:20.266562+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/schemas-i18n.spec.ts

## Purpose

Domain-level i18n test proving that `exampleFormSchema` and the local locale dictionaries (`en.json`, `it.json`) actually agree on message strings. It runs against the **real** vue-i18n instance (not a mock) so that a wrong-language message would fail the assertion. The *mechanism* of thunked Zod messages re-resolving at parse time is covered separately in `tests/cross-cutting/schemas-i18n.spec.ts`; this file lives with the domain because it validates this module's specific schema + dictionary pairing.

## Key elements

- **`setLocale(locale)`** – Calls `loadLocale(locale)` then `nextTick()` so Vue reactivity settles before the caller proceeds.
- **`messagesForEmptyTitle()`** – Runs `exampleFormSchema.safeParse({ title: '', body: 'A body' })` and returns the array of issue `message` strings.
- **`beforeAll`** – Calls `wireModulesIntoCore()` (mirroring `src/main.ts` wiring) and sets the initial locale to `'en'`.
- **`afterEach`** – Resets the locale back to `'en'` to prevent cross-test contamination.
- **`it('resolves the required-title message in English, then in Italian…')`** – Asserts the English dictionary string is present, switches to `'it'`, then asserts the Italian dictionary string is present — from the *same* schema object.

## Relationships

- **`src/modules/example/schemas.ts`** – Supplies `exampleFormSchema`, the Zod schema under test. The test's entire assertion surface is that schema's resolved messages.
- **`tests/support/unit/wire-modules.ts`** – Supplies `wireModulesIntoCore()`, which registers the i18n locale modules on the real vue-i18n instance so `loadLocale` actually has message catalogs to switch between.

## Notes

- The JSDoc explicitly warns against using a mocked `t`: a mock would only prove a key was *looked up*, not that the resolved message is in the correct language. This file deliberately uses the real instance to avoid that blind spot.
- Locale state is **shared mutable global** (vue-i18n). The `afterEach` reset is essential; omitting it would let a failed Italian assertion leak the `'it'` locale into subsequent tests in the same worker.
- `setLocale` chains `.then(() => nextTick())` — omitting `nextTick` would race the reactive locale swap against the next assertion.
