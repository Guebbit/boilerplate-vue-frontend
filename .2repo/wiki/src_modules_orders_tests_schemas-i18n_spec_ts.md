# src/modules/orders/tests/schemas-i18n.spec.ts

## Purpose

Vitest spec that verifies the orders module's Zod schemas resolve i18n messages in the correct language. It wires the **real** vue-i18n instance (not a mock), switches the active locale to Italian, parses invalid values through `ordersSchema`, and asserts the produced messages match the Italian dictionary. It complements `tests/cross-cutting/schemas-i18n.spec.ts` (which proves the thunked-Zod-message mechanism in general) by proving that *this module's* schema keys and *this module's* locale files actually agree in both languages.

## Key elements

- **`setLocale(locale)`** — Calls `loadLocale` from `@/infrastructure/i18n`, then `nextTick()`, so the active locale is updated and DOM-facing reactivity has settled before assertions run.
- **`messagesOf(schema, value)`** — Runs `schema.safeParse(value)` and returns the array of `issue.message` strings (empty array on success).
- **`beforeAll`** — Calls `wireModulesIntoCore()` to register locale dictionaries the same way `src/main.ts` does, then sets locale to `'en'` as the default.
- **`afterEach`** — Resets locale back to `'en'` between tests.
- **`it('resolves every field message in Italian')`** — Switches to `'it'`, passes `{ email: 'nope', status: 'not-a-status' }` through `ordersSchema`, and asserts the resulting messages include the values from `it.json` keys `orders-form.email-invalid` and `orders-form.status-invalid`.

## Relationships

- **`src/modules/orders/schemas.ts`** — Imports `ordersSchema`, the schema whose validation messages are the subject of the assertions.
- **`tests/support/unit/wire-modules.ts`** — Imports `wireModulesIntoCore`, which registers the module's locale dictionaries into the shared i18n instance so that `loadLocale` can resolve them.

## Notes

- Uses the real i18n instance deliberately: a mocked `t` would only confirm a key was *looked up*, which stays true even if the resolved string is frozen in the wrong language.
- Colocation is intentional per `docs/theory/modules.md`: the test lives with the orders module so deleting the folder removes this coverage rather than orphaning a spec.
- The `setLocale` helper always chains `nextTick()`; omitting it can cause assertions to read the previous locale's messages.
