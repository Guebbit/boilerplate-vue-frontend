---
source: src/modules/returns/domain/returnable-lines.ts
sha256: 3de653745771717ac1077d41a91da1301f767cf1bbe931b8856add858a33a1a6
generated_at: 2026-10-02T15:43:44.714311+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/domain/returnable-lines.ts

## Purpose

Pure domain logic that computes which order lines a customer can still return from a given order. It produces the "offer" shown in the returns form (which products, how many left), with no side effects. All results are re-validated server-side on `POST /returns`; this file only shapes what the UI presents.

## Key elements

- **`ReturnableLine`** — interface for one offerable line: `productId`, `title`, `ordered` (total quantity on the order), `remaining` (quantity still returnable after prior returns).
- **`isReturnableOrderStatus(status)`** — returns `true` only for `'shipped'` or `'delivered'`; used to gate whether a return is even possible.
- **`returnableLines(items, returns)`** — main entry point. Subtracts quantities held by non-declined returns from the order's eligible lines, excludes products flagged `noWithdrawal` (EU Art. 16), and returns an array of `ReturnableLine` in order-line order.
- **`sumByProduct`** *(private)* — helper that folds `[productId, quantity]` pairs into a `Map<string, number>`, preserving first-seen order.

## Relationships

- **`ReturnRequestForm.vue`** — consumes `returnableLines` to build the per-line quantity inputs and `isReturnableOrderStatus` to gate the form.
- **`WithdrawalPanel.vue`** — uses `isReturnableOrderStatus` to decide whether the order is in a state where a standard return (as opposed to a withdrawal) is applicable.
- **`returnable-lines.spec.ts`** — unit-tests the exported functions against fixture orders and returns.

## Notes

- **Deduplication:** An order can contain multiple lines for the same product. `returnableLines` aggregates them and emits one `ReturnableLine` per product, using a `seen` Set to avoid duplicates.
- **Declined returns are ignored:** Only returns whose status is *not* `'declined'` count toward the held quantity, so a declined return frees up stock again.
- **`remaining` can be zero or negative in edge cases** (e.g., a return filed for more than was ordered); the function filters those out with the `remaining > 0` guard, but callers should not assume `remaining === ordered` when no prior returns exist if the order has duplicate product lines.
- **`noWithdrawal` is a product-level flag**, not a line-level one — one line with the flag excludes the entire product from the result.
