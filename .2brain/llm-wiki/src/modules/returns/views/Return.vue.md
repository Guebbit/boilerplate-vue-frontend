---
source: src/modules/returns/views/Return.vue
sha256: b082547a99b38223844142f6781541b656682efd2656ad5e5a207806b137c366
generated_at: 2026-10-02T15:46:59.492003+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/views/Return.vue

## Purpose

Renders the single-return detail page (`ReturnTargetPage`), showing what came back, who pays postage, the current status, line items, and — for staff — the open actions. It is cache-first by route id but forces one re-read on arrival when the list-seeded cache row lacks an `actions` array.

## Key elements

- **`defineProps<{ id?: string }>`** – The return id from the route; drives all data loading.
- **`watchReturn(() => id, { onError: onMissingRecord })`** – Selects and fetches the return from the Pinia store whenever the route id changes; routes 404/403 to the Error page via `useMissingRecord`.
- **`refresh()`** – Forces a cache-busting re-fetch (`fetchReturn(id, { forced: true })`); called once in `onMounted` and again from `ReturnStaffActions`' `changed` event.
- **`orderTo`** (computed) – Builds the router link to the parent order, guarded with `linkIfRouted` so builds without the `orders` module simply omit it.
- **Template sections** – `ItemDetailHero` (reason, note, id), a `CardDetail` grid (status chip, postage, created/received dates, refund, handling deduction, decline reason, itemised lines), and an `#actions` slot with `ReturnStaffActions`, an optional order link, and a back-to-list button.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The component is intentionally minimal in its `<script>` (just `name`); all logic lives in `<script setup>`.
- `linkIfRouted` exists because the `OrderTarget` route name is a runtime dependency invisible to `MODULE_EDGES`; without the guard the link would crash on builds that exclude the orders module.
- `formatCurrency` receives `currentReturn.currency` (per-return currency) rather than a global locale currency — important when a return spans a different currency than the shopper's default.
- `data-test` attributes are present on status, refund, deduction, decline-reason, and each return line for e2e targeting.
