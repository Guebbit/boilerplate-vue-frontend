---
source: src/modules/products/tests/schemas-i18n.spec.ts
sha256: 8476a7639da698a9ba8da1fa903f7cba393c07d7cffa54730a6d25aee921ea32
signature: 4712da7c6ebac404e63619de3a3b1400d45495dd479495380489731b21358f95
generated_at: 2026-11-10T05:30:49.914278+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/schemas-i18n.spec.ts

## Purpose

Verifies that the products module's Zod schemas and its locale dictionaries (`en.json`, `it.json`) are in agreement: every message key the schema reaches for exists in both languages and resolves to the correct, language-specific text. Runs against the **real** vue-i18n instance (not a mocked `t`) so a message frozen in the wrong language would actually fail. The thunk/re-resolution mechanism itself is proven once in `tests/cross-cutting/schemas-i18n.spec.ts`; this file is the domain-level check that belongs with the products module.

## Key elements

- **`setLocale(locale)`** — calls `loadLocale` then `nextTick()` so Vue reactivity settles before the next assertion.
- **`messagesOf(schema, value)`** — runs `schema.safeParse(value)` and returns the array of `issues[].message` strings (empty array if parse succeeds).
- **`describe('products schema messages')`** — single test suite.
  - `beforeAll` — calls `wireModulesIntoCore()` then sets locale to `en`.
  - `afterEach` — resets locale to `en` to prevent cross-test leakage.
  - Test: feeds an invalid product object (negative price + empty English title) through `productsSchema`; asserts the `title-required` message matches the English dictionary value, then switches to `it` and asserts the **same schema object** now yields the Italian dictionary value.

## Relationships

- **`src/modules/products/schemas.ts`** — imports `productsSchema`, the system under test.
- **`tests/support/unit/wire-modules.ts`** — imports `wireModulesIntoCore()` to register the products module's locale entries with the core i18n instance, mirroring the app-boot wiring.

## Notes

- The test deliberately reuses the **same** `productsSchema` instance across the `en → it` switch; it does not re-instantiate. This is the whole point: the thunked message must re-resolve, not stay frozen at first parse.
- A mocked `t` would pass even if the resolved string were in the wrong language, because it only proves *a* lookup occurred. That's why the real vue-i18n runtime is required here.
- The file's placement (under `src/modules/products/tests/` rather than `tests/cross-cutting/`) follows the convention documented in `docs/theory/modules.md`: domain-specific schema/i18n agreement lives with the domain.
- `messagesOf` is intentionally typed with a structural schema interface (`{ safeParse: … }`) rather than importing `ZodType` directly, keeping the helper decoupled from the Zod version.
