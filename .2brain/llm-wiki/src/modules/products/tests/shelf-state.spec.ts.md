---
source: src/modules/products/tests/shelf-state.spec.ts
sha256: 12f20ba4518784c8fd10b8383bb6f96691f05c23fc7fcfae7925539ff698b92a
signature: 12f20ba4518784c8fd10b8383bb6f96691f05c23fc7fcfae7925539ff698b92a
generated_at: 2026-11-10T05:31:32.354865+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/shelf-state.spec.ts

## Purpose

Table-driven Vitest spec for `shelfStateOf`, the pure function that maps a product's purchase-related flags (`purchasable`, `preorder`, `backorder`, `inStock`) to the single shelf-state label shared by the product card, product page, and add-to-cart button. It locks in the priority order: **off-sale → preorder-with-allowance → stock badge**, with an absent `purchasable` flag treated as on-sale.

## Key elements

- **`describe('shelfStateOf')`** – Single top-level suite; no other suites.
- **`it.each([...])`** – Twelve table-driven cases (label, input object, expected string). Covers every combination of `purchasable`, `preorder`, `backorder`, and `inStock` that the domain can emit, including the "no `purchasable` flag" default path.
- **`shelfStateOf`** (imported from `../domain`) – The unit under test. Returns one of `'in-stock'`, `'out-of-stock'`, `'off-sale'`, `'preorder'`, or `'backorder'`.

## Relationships

- **`src/modules/products/domain/shelf-state.ts`** – Implementation home for `shelfStateOf`. The test imports it via the domain barrel (`../domain`), but this file is the module that actually defines the function under test.

## Notes

- The file's module doc comment is the authoritative statement of the ranking rule. If the priority changes, update that comment alongside the expected values in the table.
- An *absent* `purchasable` field (not `purchasable: false`) is the "on sale" default; `purchasable: false` is the explicit "off sale" case. The table exercises both spellings.
- `backorder: true` + `inStock: true` yields `'in-stock'`, not `'backorder'`—the stock badge wins when units are physically present, even if a backorder is also flagged.
