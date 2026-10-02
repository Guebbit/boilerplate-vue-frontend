---
source: src/modules/products/tests/schemas-i18n.spec.ts
sha256: 18eadd3e11a8ea3790f54ddb417d62e92488a4dddc548f8f8fb4becd52dad822
generated_at: 2026-10-02T15:39:24.656694+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/schemas-i18n.spec.ts

## Purpose

Verifies that the products module's Zod schemas and its locale dictionaries actually agree: every message key a schema references exists in both `en.json` and `it.json` and resolves to different text. It runs against the real `vue-i18n` instance (not a mocked `t`) so a wrong-language freeze would be caught. The *mechanism* (thunked messages re-resolving at parse time) is proven separately in `tests/cross-cutting/schemas-i18n.spec.ts`; this file proves *this module's* schemas and dictionaries are consistent.

## Key elements

- **`setLocale(locale)`** — Calls `loadLocale` then `nextTick()` so DOM-facing reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — Runs `schema.safeParse(value)` and returns the flat array of `message` strings from any Zod issues.
- **`describe('products schema messages')`** — Single test block. `beforeAll` calls `wireModulesIntoCore()` then sets locale to `en`; `afterEach` resets to `en`.
- **`it('resolves in English, then in Italian, from the same schema object')`** — Feeds a deliberately invalid product object through `productsSchema`, asserts the English message contains `enMessages['products-form']['title-required']`, then switches to Italian and asserts the Italian equivalent.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, called in `beforeAll` to register the products module's i18n messages with the core vue-i18n instance exactly as `src/main.ts` does in production.
- **`@/i18n`** — `loadLocale` is the runtime locale-switch entry point used by `setLocale`.
- **`@/modules/products/schemas.ts`** — `productsSchema` is the Zod schema under test.
- **`../locales/en.json` / `../locales/it.json`** — Imported as plain JSON objects to supply the expected message strings for assertions.

## Notes

- The file deliberately avoids mocking `t`; a mock would only confirm a key was *looked up*, which stays green even if the resolved text is frozen in the wrong language.
- `afterEach` resets to `en` so a failure in this file doesn't leak locale state into sibling specs.
- The separation of concerns is documented in the file header: mechanism proof → `tests/cross-cutting/schemas-i18n.spec.ts`; per-module agreement proof → this file. See `docs/theory/modules.md` for the rationale.
