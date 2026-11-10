---
source: src/modules/shop-tasks/notices.ts
sha256: f24263792906f4a8e72d03467afec92159e2dd69e16351b41899cdc20ff0292e
signature: 019b5b37f8607dd8557b147cff503cc57d85c52a281a8c683c40cafdb492b762
generated_at: 2026-11-10T05:42:52.902986+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/notices.ts

## Purpose

Declares every notification code the shop module owns, as `AppNotice` entries (each with a `describe` formatter and a `target` screen link). This is the registry the shell's bell consults; the foundation's bell knows none of these codes directly.

## Key elements

- **`SUMMARY_CODES`** — `as const` array of the 10 staff summary notice codes (transfers-due, preorders-late, low-stock, etc.). All share the same shape: a count, no id.
- **`orderTarget`** — Helper that builds a `NoticeTarget` to the `OrderTarget` route using `notice.params.orderId`. Used by the three buyer order-related codes (fulfillment-delayed, fulfillment-held, shipment-lost).
- **`summaryNotice`** — A single shared `AppNotice` for all summary rows. `describe` interpolates the count via `translate`; `target` links to `notice.params.work` (the filtered list path the server named).
- **`summaryNotices`** — Object mapping each `SUMMARY_CODES` entry to the same `summaryNotice` instance.
- **`shopNotices`** *(exported)* — The full `Record<string, AppNotice>` for every shop notice code. Combines the individual buyer/staff entries with the spread `...summaryNotices`.

## Relationships

- **`src/modules/shop-tasks/describe.ts`** — Source of the `ShopNotice` type and the five `describe*` functions (`describeProduct`, `describePreorder`, `describeHeld`, `describeLost`, `describeMergeRefused`) used as `describe` callbacks.
- **`src/modules/shop-tasks/module.ts`** — Consumes the `shopNotices` export to register the entries with the app's notice registry.
- **`src/modules/shop-tasks/tests/notices.spec.ts`** — Tests the `shopNotices` export.

## Notes

- All 10 summary codes share one `AppNotice` object (`summaryNotice`); only the code key differs. This keeps the summary logic in a single place.
- `cart-line-removed` targets `Cart` (not `ProductTarget`) because the product no longer exists and a product link would 404. Conversely, `stock-alert` targets `ProductTarget` because the product is still buyable.
- `params.work` on summary rows is the single source of truth for the filtered-list path; the digest mail reuses the same value, so changing the list requires updating the server-side naming, not this file.
- The two staff record-level codes (`purchase-hold-placed`, `return-requested`) are the only notices that need a `NoticeContext` helper (`formatDate` / `translate`) beyond a plain `translate(code)` call.
