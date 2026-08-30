# src/modules/products/tests/schemas-i18n.spec.ts

## Purpose

Verifies that the products module's Zod schemas and its own locale dictionaries actually agree: every message key the schemas reference exists in both `en.json` and `it.json`, and the Italian copy resolves to text different from the English copy. Unlike the cross-cutting mechanism test, this file proves a fact specific to *this* domain.

## Key elements

- **`setLocale(locale)`** – Calls `loadLocale` and then `nextTick()` so DOM-facing reactivity settles before assertions run.
- **`messagesOf(schema, value)`** – Runs `schema.safeParse(value)` and extracts the `message` string from every issue, returning `[]` on success.
- **`describe('products schema messages')`** – The single test suite. Calls `wireModulesIntoCore()` in `beforeAll`, resets locale to `en` in `afterEach`, and contains one test that:
  1. Parses `{ title: '', price: -1 }` against `productsSchema` under `en`, asserting the result contains `enMessages['products-form']['title-required']`.
  2. Switches to `it` on the *same* schema object, re-parses, and asserts the result contains `itMessages['products-form']['title-required']`.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – Imports `wireModulesIntoCore` and calls it in `beforeAll` to register the products module's locale messages into the shared i18n core, replicating what `src/main.ts` does at application boot. Without this wiring the schema's thunked messages would resolve against an empty dictionary.

## Notes

- Uses the **real** vue-i18n instance (via `loadLocale`), not a mocked `t`. The file's comment explains why: a mock would only confirm a key was *looked up*, which stays true even if the message is frozen in the wrong language.
- Co-located in the products module folder by design: deleting the module folder removes this coverage automatically, per the convention in `docs/theory/modules.md`.
- The cross-cutting *mechanism* proof (thunked Zod messages re-resolve at parse time) lives separately in `tests/cross-cutting/schemas-i18n.spec.ts` and uses an invented schema; this file only checks agreement between this module's schemas and its dictionaries.
