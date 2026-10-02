---
source: src/modules/orders/tests/schemas-i18n.spec.ts
sha256: 3474f100d1fee525db0046c259310431ae72548388dcf21a3f1a994f8f6e1eef
generated_at: 2026-10-02T15:24:00.581384+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/schemas-i18n.spec.ts

## Purpose

Validates that the orders module's Zod schemas and its Italian locale dictionary actually agree: every error key the schemas look up exists in `it.json`, and the Italian strings are genuinely translated (not a copy of the English). Runs against the real vue-i18n instance rather than a mocked `t`, so a regression that freezes a message in the wrong language would be caught.

## Key elements

- **`setLocale(locale)`** — calls `loadLocale` then `nextTick`, so reactive i18n updates settle before assertions run.
- **`messagesOf(schema, value)`** — runs `schema.safeParse(value)` and returns the array of issue `message` strings for the currently active locale.
- **`describe('orders schema messages')`** — single test block. `beforeAll` wires the real modules into core and sets locale to `'en'`; `afterEach` resets to `'en'`.
- **`it('resolves every field message in Italian')`** — switches to `'it'`, parses an invalid `{ email, status }` object through `ordersSchema`, and asserts the returned messages include the exact strings from `it.json` under `orders-form`.

## Relationships

- **`src/modules/orders/schemas.ts`** — source of `ordersSchema`, the schema whose error messages are under test.
- **`tests/support/unit/wire-modules.ts`** — source of `wireModulesIntoCore()`, which registers the orders module's i18n dictionaries into the shared vue-i18n instance the same way `src/main.ts` does.

## Notes

- A mocked `t` would only prove a key was looked up; this spec uses the real i18n instance so the assertion also verifies the *resolved string* matches the Italian dictionary.
- The general mechanism (Zod thunked messages re-resolve at parse time) is covered elsewhere in `tests/cross-cutting/schemas-i18n.spec.ts`. This spec is intentionally colocated with the orders module so deleting the module removes its i18n coverage automatically (see `docs/theory/modules.md`).
- `it.json` is imported at the top level and used as the expected-value source, making the test self-contained: if a key is missing from the dictionary the test fails with a clear diff rather than a silent undefined.
