---
source: src/modules/orders/domain/reorder.ts
sha256: 0433dc6e3a07e55da2b0fb4900c060cc9a4a4697ced1d8081f31c90924e6aaec
signature: 12ee59641533dd347e9c1a28913683fdb67b2f97f49e5209266f87f213c7e89f
generated_at: 2026-11-10T04:59:06.061588+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/reorder.ts

## Purpose

Pure domain rule that interprets a server's per-line reorder response (`MergeLineResult[]`) into a display-ready summary of what was *not* added to the cart — which products are gone from the catalogue and which hit the cart's cap. It exists to keep this "read back" logic free of Vue/store concerns so it is trivially testable and reusable.

## Key elements

- **`ReorderedOrderLine`** – Minimal read-only shape for one past-order line (`product.id`, optional `product.title`). Only the fields this rule needs.
- **`ReorderOutcome`** – Two display-name arrays: `gone` (reason `"removed"`) and `capped` (reason `"capped"`), preserving the order the server reported them in.
- **`reorderOutcome(orderLines, results)`** – Maps order-line product IDs to display names, then buckets the results by `reason`. Returns a `ReorderOutcome`. "Summed" results are intentionally ignored (expected happy path).

## Relationships

- **`src/modules/orders/domain/index.ts`** – Barrel file for the orders domain layer; re-exports `reorderOutcome` (and the two interfaces) so callers import from the domain entry point rather than this file directly.

## Notes

- The function is **pure** and synchronous — no I/O, no framework imports.
- Display names fall back to the raw `productId` if the order line had no `title`; callers should expect either a human-readable string or an ID.
- The ordering of names in `gone`/`capped` mirrors the server's result array, *not* the original order's line order.
- "Summed" results are silently dropped; this is intentional, not a bug — the shopper already sees those items in the cart.
