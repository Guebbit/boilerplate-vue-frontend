---
source: src/modules/shop-tasks/describe.ts
sha256: ab1642251bfb603cb983ef350b5474901e7f0d980bee5f48dc6e562b3da49a2b
signature: b76f99c32d9eda9a6b24b6cdfeb923978c216418fdbe540a34ffc1f91e3a6748
generated_at: 2026-11-10T05:42:24.611232+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/describe.ts

## Purpose

Pure formatting functions that turn a shop-task notification (a code plus its `params`) into a localized sentence. The caller supplies the translate function and the reader's preferred languages via `NoticeContext`; the server itself stores no text, only the code and the data the sentence needs.

## Key elements

- **`ShopNotice<TCode>`** — type alias that extracts the specific `Notification` variant for a given shop-task code, so each builder's `params` are correctly typed.
- **`productName(titles, context)`** — resolves a product name from the `titles` locale-map: first match in `preferred` wins, then any non-empty value, then a generic "unknown product" translation.
- **`describeProduct(notice, context)`** — single-product notices (cart-line-removed, wishlist-item-removed, stock-alert); substitutes the product name into the code's template.
- **`describeMergeRefused(notice, context)`** — guest-cart merge refusal; renders each refused line ("name × qty") joined by `; `, or a bare sentence when no lines are listed.
- **`describePreorder(notice, context)`** — fulfillment-delayed notice; picks dated vs. undated key, joins multiple titles with `, `, and formats dates via `formatDay`.
- **`describeHeld(notice, context)`** — fulfillment-held notice; appends the shop's free-form message sentence if present.
- **`describeLost(notice, context)`** — shipment-lost notice; assembles up to three parts (reason, owed-amount + date, shop message) joined by spaces, skipping any that are absent.
- **`HELD_KEYS`, `LOST_KEYS`** — literal key maps kept in source so a dead-key / unused-translation scanner can see them.

## Relationships

- **`src/kernel/registry.ts`** — imports the `NoticeContext` type (provides `preferred`, `translate`, `formatDay`) that every `describe*` function destructures.
- **`src/modules/shop-tasks/notices.ts`** — sibling module in the same directory; presumably the dispatcher/router that selects which `describe*` function to call for a given notification code.
- **`src/modules/shop-tasks/tests/notices.spec.ts`** — test suite that exercises the notice pipeline, including the output of these describe functions.

## Notes

- All functions are pure: no I/O, no module-level state. The translate and date-format capabilities are injected via `context`, making them trivially testable.
- `productName` silently falls back to *any* locale if none of the reader's `preferred` languages have a title — only a fully empty map triggers the "unknown product" key.
- `describeLost` and `describeHeld` use `.filter(...).join(' ')` to assemble variable-length sentences; the order of parts is fixed (reason → owed → message) and the language's word order is handled by the dictionary template, not by JS string concatenation.
- The `HELD_KEYS` / `LOST_KEYS` constants exist specifically so a static "unused translation key" check can confirm every key is referenced; don't inline the strings.
