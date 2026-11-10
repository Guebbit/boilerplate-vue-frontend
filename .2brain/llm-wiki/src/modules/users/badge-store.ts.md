---
source: src/modules/users/badge-store.ts
sha256: 43596bf03d6798b8cfa5f8aa813c9c64fee0d3b9898e25717a39da6dd93ee869
signature: c80444908f4476fa588ae0763a1a48f818ff125676ff3402bb7e1f9b1141f0b2
generated_at: 2026-11-10T06:02:19.300583+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/badge-store.ts

## Purpose

A narrowly scoped Pinia store that holds a single number — the count of live accounts flagged for purchase-hold review — for the navigation badge. It is intentionally split out of the main users CRUD store (`store.ts`) because the badge accessor executes in the shell's entry chunk, while the CRUD store must remain in the users route chunk.

## Key elements

- **`useUsersBadgeStore`** — Pinia store (id `'users-badge'`); the only export.
- **`reviewTotal`** — `ref<number | undefined>`; the badge count. `undefined` until first read and after sign-out.
- **`loadReviewTotal(forced?)`** — Fetches the count via `listUsers({ pageSize: 1, purchaseHoldReview: true, deleted: false })`, reads only `meta.totalItems`. Respects a `BADGE_FRESH_MS` staleness window; `forced` skips it. Marked `asPassive()` (app-initiated, not user-triggered).

## Relationships

- **`src/modules/users/composables/use-review-badge.ts`** — Consumes this store: reads `reviewTotal` to render the badge and calls `loadReviewTotal` to refresh the count.

## Notes

- **Chunk-boundary constraint:** This file must stay in the entry-chunk import graph. Moving the CRUD store logic here (or merging it back into `store.ts`) would break the split.
- **`pageSize: 1` trick:** The request fetches exactly one row solely to read `meta.totalItems`; the row data itself is discarded.
- **`fetchAny` over record fetch:** The toolkit's REST slice is used for its ad-hoc (`fetchAny`) capability because the count is response metadata, not a CRUD record.
- **`reviewTotal` is optional by design:** Code consuming it must handle `undefined` (pre-first-load and post-sign-out states).
