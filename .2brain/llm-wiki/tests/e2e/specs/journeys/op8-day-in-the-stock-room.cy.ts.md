---
source: tests/e2e/specs/journeys/op8-day-in-the-stock-room.cy.ts
sha256: 375ad5731332756d60b56f5ae0d904c39949f36f1c8b232fa8a56857d57623f9
signature: 5086f3cd695e555ee4d73bd73a99c77a7ec86fb048a1d899910b898af7028c7a
generated_at: 2026-11-10T07:20:00.430757+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op8-day-in-the-stock-room.cy.ts

## Purpose

End-to-end Cypress journey test for the warehouse stock-room workflow (OP8). It verifies that recording a delivery, writing off damaged units, filtering the inventory board to low-stock items, and reading the movement ledger with notes all stay consistent for a single product, and that the product page reflects the final count.

## Key elements

- **`STARTING_UNITS` (3), `DELIVERED` (10), `DAMAGED` (2)** — Story constants; the starting count is deliberately below the `NODE_LOW_STOCK_THRESHOLD` (5) so the low-stock board has exactly one matching row.
- **`ProductLike`** — Minimal `{ id, available }` shape used for API assertions.
- **`pickProduct(field, title)`** — Helper that clears an autocomplete input (to dismiss the "All products" default), types the title, and clicks the matching listbox option.
- **`describe('OP8 · A day in the stock room')`** — Single test with five `cy.step` blocks:
  1. Board lists the product as low stock (after checking `levels-low-only`).
  2. Receipt of `DELIVERED` units with a note; API asserts `available === 13`.
  3. Adjustment of `−DAMAGED` units with a note; API asserts `available === 11`.
  4. Product no longer appears under the low-stock filter (row should not exist).
  5. Ledger filtered by product shows 3 movement rows; further filtered by "adjust" reason shows 1 row containing the note text. Clicking a board row's history link also surfaces at least one movement.

## Relationships

No graph neighbors are recorded for this file. The `requires-module` header comment declares runtime dependencies on the `account`, `inventory`, `orders`, and `products` backend modules.

## Notes

- **Board table vs. row:** When no product is low-stock, the board removes the table entirely. Assertions must target `[data-test=level-row]` (absent) rather than the table element.
- **Autocomplete "All products" default:** The product filter retains "All products" as its visible text until a user selects an option, so `pickProduct` must `.clear()` before typing.
- **Opening stock is a ledger entry:** The initial stock of 3 units is itself a movement row, which is why the unfiltered ledger shows 3 rows (opening + delivery + adjustment), not 2.
- **Product page caching:** The guest-facing product page is cached for one hour and does *not* follow inventory changes in real time; that behavior is owned by OP21, not this test.
- **Checkbox interactions** use `{ force: true }` because the inputs are toggled in a form context where Cypress's default actionability checks can interfere.
- **State isolation:** `beforeEach` calls `cy.restore()` (snapshot restore) before re-visiting, so each run starts from a clean database.
