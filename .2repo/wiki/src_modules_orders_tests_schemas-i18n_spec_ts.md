# src/modules/orders/tests/schemas-i18n.spec.ts

## Purpose

Vitest spec that verifies the orders schemas' i18n message keys actually resolve to the correct Italian strings (not just that a key was looked up). It runs against the real vue-i18n instance with the domain's own locale dictionaries, confirming that every message key the schemas reach for exists in `it.json` and that the Italian copy differs from English.

## Key elements

- **`setLocale(locale)`** — local helper; calls `loadLocale` then `nextTick()` so Vue reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — local helper; `safeParse`s a value and returns the array of `issue.message` strings (or `[]`).
- **`describe('orders schema messages')`** — the single test block. `beforeAll` wires modules into the i18n core and sets locale to `'en'`; `afterEach` resets to `'en'`.
- **`'resolves every field message in Italian'`** — switches to `'it'`, parses an invalid `{ email, status }` object through `ordersSchema`, and asserts the resulting messages include the values found under `itMessages['orders-form']['email-invalid']` and `['status-invalid']`.

## Relationships

- **`src/modules/orders/schemas.ts`** — imports `ordersSchema`, the Zod schema whose validation messages are the subject of the test.
- **`tests/support/unit/wire-modules.ts`** — imports `wireModulesIntoCore`, which registers the orders locale dictionaries into the shared i18n instance the same way `src/main.ts` does.

## Notes

- The mechanism "thunked Zod messages re-resolve at parse time" is covered elsewhere (`tests/cross-cutting/schemas-i18n.spec.ts`); this file only proves *this module's* keys and dictionary agree.
- A mocked `t` function would only assert a key was looked up, which still passes if the message is frozen in the wrong language — hence the real instance is used.
- Per the module theory in `docs/theory/modules.md`, deleting the orders folder removes this coverage without breaking an orphan spec.
