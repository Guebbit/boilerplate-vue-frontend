# src/modules/products/tests/schemas-i18n.spec.ts

## Purpose

Cross-checks the products module's Zod schemas against its own locale dictionaries (en/it), verifying that message keys the schemas reference exist in both languages and resolve to different translated text. It runs against the **real** vue-i18n instance (not a mocked `t`) so it catches cases where a message is frozen in the wrong language. The thunked-message re-resolution *mechanism* is proven elsewhere (`tests/cross-cutting/schemas-i18n.spec.ts`); this file only proves this module's data agrees.

## Key elements

- **`setLocale(locale)`** — Switches the active locale via `loadLocale`, then awaits `nextTick()` so DOM-facing reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — Calls `schema.safeParse(value)` and returns the flat array of `issue.message` strings (empty array on success).
- **`beforeAll`** — Calls `wireModulesIntoCore()` to register all modules' messages with the real i18n instance (mirroring `src/main.ts`), then sets locale to `en`.
- **`afterEach`** — Resets locale to `en` to avoid cross-test contamination.
- **Single test** — Parses an intentionally invalid `{ title: '', price: -1 }` through `productsSchema`, asserts the English message for `products-form.title-required` is present, then switches to Italian and asserts the Italian message for the same key is present from the *same* schema object.

## Relationships

- **`tests/support/unit/wire-modules.ts`** → imports `wireModulesIntoCore`, called in `beforeAll` to populate the real vue-i18n instance with all modules' message dictionaries exactly as `src/main.ts` would. Without this call the i18n instance would have no product messages registered.
- **`@/modules/products/schemas.ts`** → imports `productsSchema`, the object under test.
- **`@/infrastructure/i18n`** → imports `loadLocale`, used by the `setLocale` helper to switch the active locale at runtime.
- **`../locales/en.json` / `../locales/it.json`** → imported to look up the expected translated strings for assertion comparison.

## Notes

- A **mocked** `t` would only confirm a key was looked up; it stays green even when the resolved message is frozen in the wrong language. This file deliberately avoids that by exercising the real i18n runtime.
- Assertions use `expect.arrayContaining` rather than exact equality, so the test tolerates additional validation issues on the same parse call.
- The `nextTick()` after each locale switch is load-bearing: without it, reactive message resolution may not have flushed and the assertion would read a stale value.
- The file deliberately does **not** test the thunk/re-resolution mechanism itself; that belongs to `tests/cross-cutting/schemas-i18n.spec.ts`. Keep the two concerns separate.
