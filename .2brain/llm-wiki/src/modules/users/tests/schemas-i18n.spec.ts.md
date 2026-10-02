---
source: src/modules/users/tests/schemas-i18n.spec.ts
sha256: 01bd0a292803bea4a0d607af516d7e869540e6adb03e6bf866805a511879a9ee
generated_at: 2026-10-02T15:47:59.203038+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/schemas-i18n.spec.ts

## Purpose

Verifies that the users module's Zod schemas produce validation messages in the active locale (English and Italian) by running `safeParse` against the real `vue-i18n` instance. Complements the cross-cutting mechanism test (`tests/cross-cutting/schemas-i18n.spec.ts`) by proving *this* module's schemas and its own locale dictionaries actually agree, rather than demonstrating the thunked-message re-resolution mechanism in isolation.

## Key elements

- **`setLocale(locale)`** — Calls `loadLocale(locale)` then awaits `nextTick()` so DOM-facing reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — Runs `schema.safeParse(value)` and returns the array of `issue.message` strings (empty array on success).
- **Test: "resolves in English, then in Italian, from the same schema object"** — Feeds an invalid `{ email, username }` to `usersSchema`, asserts the English `email-invalid` message is present, then switches to `it` and asserts the Italian equivalent.
- **Test: "does the same for every password rule, including the refinements"** — Feeds the string `'short'` to `usersPasswordSchema` under Italian locale and asserts all four refinement messages (`password-min`, `password-maius-required`, `password-number-required`, `password-special-required`) appear.
- **`beforeAll` / `afterEach`** — Wires modules into the core i18n instance once; resets locale back to `en` after each test.

## Relationships

- **`src/modules/users/schemas.ts`** — Source of `usersSchema` and `usersPasswordSchema`, the two objects under test.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, which registers the real locale modules into the shared vue-i18n instance exactly as `src/main.ts` does, so the test exercises the production wiring path.
- **`../locales/en.json` / `../locales/it.json`** — Imported to reference the expected message strings directly, keeping assertions decoupled from hard-coded literals.

## Notes

- The test deliberately uses the **real** `vue-i18n` instance rather than a mocked `t`. A mocked `t` would only confirm that a key was looked up, which remains true even if the message is frozen in the wrong language — the exact regression this file guards against.
- The schema parameter in `messagesOf` is typed structurally (`{ safeParse: … }`) instead of importing the Zod type, keeping the helper decoupled from the specific schema class.
- Per the module doc-comment, this file lives under `src/modules/users/tests/` (domain-adjacent) rather than in `tests/cross-cutting/`, following the convention described in `docs/theory/modules.md`.
