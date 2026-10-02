---
source: src/modules/returns/tests/returnable-lines.spec.ts
sha256: 26101f8b060847613c546cb04f3e9d5b22d668aa7a221e9f862a9bcb411e7788
generated_at: 2026-10-02T15:45:51.578165+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/returnable-lines.spec.ts

## Purpose

Unit tests for the returns-domain helpers `returnableLines` and `isReturnableOrderStatus`. They verify the arithmetic that determines which order lines (and how many units) a customer can still return, given prior return requests, and that only shipped/delivered orders qualify.

## Key elements

- **`line(id, quantity, noWithdrawal?)`** — local factory that builds a single `Order['items'][number]` with minimal fields (product id/title/price, quantity, locale). Defaults `noWithdrawal` to `false`.
- **`returnOf(status, lines)`** — local factory that wraps an array of `[productId, quantity]` tuples into a return object via the shared `aReturn` fixture. Accepts only `'requested'` or `'declined'` statuses.
- **`describe('returnableLines')`** — five test cases covering: full-quantity passthrough, partial-return subtraction with full-return exclusion, declined returns being ignored, `noWithdrawal` lines being dropped, and duplicate product lines being merged into one entry.
- **`describe('isReturnableOrderStatus')`** — parameterised table test asserting `shipped`/`delivered` → `true`, all other statuses (and `undefined`) → `false`.

## Relationships

- **`src/modules/returns/domain/returnable-lines.ts`** — the system under test; imports `returnableLines` and `isReturnableOrderStatus`.
- **`tests/support/unit/fixtures.ts`** — provides the `aReturn` and `anOrder` factory fixtures used to construct test data.
- **`@types`** — imports the `Order` type to type the `line` helper's return value.

## Notes

- The `returnOf` helper only supports `'requested'` and `'declined'` statuses; there is no test exercising an `'approved'` or other return status. If the domain adds a new status, these tests will not cover it until updated.
- The `line` helper hard-codes `price: 10` and `taxRate: 0.22`; the return fixtures also use `unitPrice: 10`. These values are irrelevant to the assertions (which only check product id, title, ordered, remaining) but could mask a future bug if the arithmetic ever starts reading price fields.
- The `@module` JSDoc block at the top of the file is descriptive, not a real module export—this file has no `export` statements.
