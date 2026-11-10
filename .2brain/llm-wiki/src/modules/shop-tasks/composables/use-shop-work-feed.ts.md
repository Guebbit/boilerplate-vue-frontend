---
source: src/modules/shop-tasks/composables/use-shop-work-feed.ts
sha256: 18c352cd76a81e909d8445b193292128108267009f8276268c205a21fda1c52c
signature: 853f9bd88b43920ffbd39926e645076794b0f78208a8c2f69f2d1cc39cadc223
generated_at: 2026-11-10T05:42:13.560647+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/composables/use-shop-work-feed.ts

## Purpose

A one-shot composable that wires the kernel's badge-refresh mechanism to the shop-tasks summary endpoint. It runs for the lifetime of the shell component that calls it, feeding work-count badges to any viewer who holds at least one relevant permission and doing nothing for everyone else.

## Key elements

- **`useShopWorkFeed()`** (exported) — The sole export. Called once from an app-bar component. It:
  - Computes `readerId`: resolves to the current viewer's id if they hold *any* of `display:Order`, `display:Payment`, `read:Return`, or `read:StockLevel`; otherwise `undefined`.
  - Registers a badge-refresh subscription via `useBadgeRefresh`, passing:
    - `readerId` (the computed gate),
    - `read` → delegates to the shop-tasks store's `loadSummary(forced)` method,
    - `clear` → calls `clearWorkCounts` to reset badge state.

## Relationships

- **`src/kernel/work-counts.ts`** — Imports `clearWorkCounts`, which is passed as the `clear` callback so the kernel can reset badge counts when the feed stops.
- **`src/modules/shop-tasks/store.ts`** — Imports `useShopTasksStore`; the `read` callback calls into this store to fetch the summary data, making it the data-fetching layer for the badge feed.
- **`src/modules/shop-tasks/components/ShopWorkFeed.vue`** — The expected caller of `useShopWorkFeed()`; per the module doc-comment it is mounted in the app bar.
- **`src/modules/shop-tasks/tests/work-feed.spec.ts`** — Unit/integration tests exercising this composable's gating and refresh behavior.

## Notes

- Intended to be invoked **exactly once** from the app-bar component; calling it multiple times would create duplicate refresh subscriptions.
- The permission check is a simple OR of four `session.can` calls and is deliberately kept in sync with the route guards of the five shop-tasks screens. Keep them in lockstep when permissions change.
- When `readerId` is `undefined` (no relevant permission), `useBadgeRefresh` is expected to short-circuit and issue no network request—no badge, no poll.
