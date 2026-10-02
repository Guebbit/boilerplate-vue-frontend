---
source: src/modules/orders/domain/reorder.ts
sha256: 5216a5fa6d920e162ff21e907a73bcd351020d04f2ef6235f5273ee6d2a0042f
generated_at: 2026-10-02T15:20:44.332217+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/reorder.ts

## Purpose

Pure domain rule that determines which products a past order contained but the re-created cart does not. The server silently drops any line whose product has left the catalogue during a reorder; this module reads the order lines and the resulting cart back and reports what went missing. No Vue, no store, no side effects.

## Key elements

- **`ReorderedOrderLine`** (interface) — minimal shape of an order line as this rule sees it: a frozen `product` with `id` and optional `title`.
- **`leftOutByReorder(orderLines, cartProductIds)`** (exported function) — filters order lines whose `product.id` is absent from the post-reorder cart IDs, then maps each to a display name (`title` falling back to `id`). Returns an array in the order's original line order.

## Relationships

- **`src/modules/orders/domain/index.ts`** — the domain barrel file re-exports this module's public API (`leftOutByReorder`, `ReorderedOrderLine`) so callers import from the domain index rather than reaching into individual files.

## Notes

- Matching is by **product ID**, not quantity. If the server clamps a line to the cart's own quantity limit, the product still "landed" and is *not* reported as left out.
- The return value is a display-string array, not an object or ID array—callers can render it directly (e.g., a toast listing dropped items).
- The module docblock references `docs/theory/domain-layer.md` for the rationale behind the domain/presentation split.
