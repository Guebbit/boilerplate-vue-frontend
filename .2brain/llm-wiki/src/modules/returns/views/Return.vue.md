---
source: src/modules/returns/views/Return.vue
sha256: f77a12389186806720af8a62f6c0e8a24da0c0db7f99c139beed4107bd3e85a1
generated_at: 2026-10-17T01:39:27.311767+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/views/Return.vue

## Purpose

Detail page for a single return. Displays the return's items, status, postage responsibility, refund/deduction amounts, and — for staff — the actions still available. Loads by route `id` using the returns store's cache, then forces one fresh read on mount to guarantee the `actions` list is present (list-seeded cache rows carry none).

## Key elements

- **Named component block** — sets `name: 'ReturnTargetPage'` so devtools and `<KeepAlive>` can identify the SFC (not possible inside `<script setup>` alone).
- **`id` prop** — optional route parameter identifying the return.
- **`watchReturn`** (from store) — selects the return in the store whenever `id` changes; routes 404/403 to `onMissingRecord`.
- **`fetchReturn`** (from store) — performs a forced (cache-bypassing) read for a given id.
- **`refresh`** — wraps `fetchReturn` with error handling; called in `onMounted` and as the handler for `ReturnStaffActions`' `changed` event.
- **`orderTo`** (computed) — resolves a link to the parent order via `linkIfRouted`; yields `undefined` (hiding the link) if the orders module is absent.
- **Template** — `ItemDetailLayout` with a hero (reason, note, id), a `CardDetail` grid of fields (status chip, postage, created/received dates, refund, deduction, decline reason, line items), and an actions slot containing `ReturnStaffActions` plus back-to-order / back-to-list buttons.

## Relationships

- **`src/modules/returns/store.ts`** — Source of `watchReturn`, `fetchReturn`, and the reactive `currentReturn` reference. This view is the primary consumer of that store's read path.
- **`src/modules/returns/components/ReturnStaffActions.vue`** — Rendered in the actions slot when a return is loaded. Receives the full `currentReturn` as `item`; emits `changed`, which this view handles by calling `refresh()`.

## Notes

- The forced read on mount is intentional: the returns list seeds the Pinia cache with rows that have no `actions` array, so without it staff would see no actionable buttons on first arrival.
- The `orderTo` link is a *soft* cross-module dependency — it uses a route name (`'OrderTarget'`) that the build-time `MODULE_EDGES` graph cannot resolve, hence the runtime `linkIfRouted` guard rather than a static import.
- All user-visible strings go through `useI18n().t`; date/currency formatting uses shared helpers from `@/infrastructure/utils/formatters.ts`.
- `data-test` attributes are present on every conditionally-rendered field to support e2e selectors.
