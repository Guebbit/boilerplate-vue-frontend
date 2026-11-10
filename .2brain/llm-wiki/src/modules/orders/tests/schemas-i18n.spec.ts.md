---
source: src/modules/orders/tests/schemas-i18n.spec.ts
sha256: 5ea71bab9498cf10f52e6a18c66fb2246412d25cb9af585ab039113fb51b8fe1
signature: bbcc893b40cb9ae94067bb67ce46b22e62b79e1e5cd573f7698feff4e15fbe0e
generated_at: 2026-11-10T05:04:50.167435+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/schemas-i18n.spec.ts

## Purpose

Vitest spec that verifies the orders module's Zod schemas and its own Italian locale dictionary (`locales/it.json`) agree: every message key the schemas resolve at parse time exists in the dictionary, and the Italian strings are genuinely Italian (not copies of English). It runs against the real `vue-i18n` instance with modules wired through the shared test helper, so a message frozen in the wrong language would fail.

## Key elements

- **`setLocale(locale)`** — calls `loadLocale` and awaits `nextTick()` so Vue reactivity settles before assertions run.
- **`messagesOf(schema, value)`** — runs `schema.safeParse(value)` and returns the array of issue `message` strings (or `[]` if valid). Accepts a structural (duck-typed) parameter so it does not import Zod.
- **`describe('orders schema messages')`** — the suite. `beforeAll` calls `wireModulesIntoCore()` then sets locale to `'en'`; `afterEach` resets to `'en'`.
  - *"resolves every field message in Italian"* — switches to `'it'`, feeds `{ email: 'nope' }` through `ordersSchema`, and asserts the message matches `itMessages['orders-form']['email-invalid']`.
  - *"resolves the shipping-address messages in Italian: required and too long"* — switches to `'it'`, then feeds a near-valid address with an empty `street` (expecting `error-required`) and a 21-char `zip` (expecting `error-too-long` with `{max}` interpolated to `'20'`) through `shippingAddressCorrectionSchema`.

## Relationships

- **`src/modules/orders/schemas.ts`** — the spec imports `ordersSchema` and `shippingAddressCorrectionSchema` and drives them with invalid values to check the messages they emit.
- **`tests/support/unit/wire-modules.ts`** — the spec calls `wireModulesIntoCore()` in `beforeAll` to register the orders module's locale dictionaries on the global i18n instance, replicating production wiring.

## Notes

- This spec is deliberately **domain-local**: it proves *this* module's schemas and *this* module's dictionary agree. The general "thunked Zod message re-resolves at parse time" mechanism is proven separately in `tests/cross-cutting/schemas-i18n.spec.ts`. Deleting the orders folder removes this coverage rather than breaking a spec that belongs to another module (see `docs/theory/modules.md`).
- A mocked `t` is intentionally avoided: a mock would only confirm a key was looked up, which stays true even if the message is frozen in the wrong language. The real `vue-i18n` instance guarantees the final string is checked.
- The "too long" assertion uses `.replace('{max}', '20')` to verify the `vue-i18n` named-parameter interpolation is populated, not left as a literal `{max}`.
