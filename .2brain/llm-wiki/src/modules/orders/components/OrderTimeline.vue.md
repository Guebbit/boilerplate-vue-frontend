---
source: src/modules/orders/components/OrderTimeline.vue
sha256: 203b28343366f159a78abc568a7d1ecc519928d4819b820fa6b7a31224e8c165
generated_at: 2026-10-17T01:14:53.701214+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/components/OrderTimeline.vue

## Purpose

Renders the per-order event history as a vertical list (oldest first). All row filtering is server-side; this component simply displays whatever the API returns for the signed-in caller and annotates staff-only rows with a badge. It exists to separate the "read and present a timeline" concern from the parent `Order.vue` page.

## Key elements

- **`props`** – `orderId` (string) and optional `refreshKey` (any value that changes when the order mutates); both drive the fetch `watch`.
- **`load()`** – Calls `useOrdersStore().fetchTimeline(orderId)`. Guards against out-of-order responses with a monotonically increasing `latestRead` ticket. Sets `entries`, `readError`, or `loading` only if the ticket is still current.
- **`lines` (computed)** – Maps each raw `OrderTimelineEntry` through `describeTimelineEntry(entry, tools)` to produce `{ title, detail }` strings. Re-evaluates on language change because `tools.t` / `tools.has` are reactive i18n closures.
- **`tools: TimelineTools`** – Binds the app's i18n `t`/`te`, `formatCurrency`, and `formatDate` so the pure domain function can produce localised text without importing UI layers itself.
- **`isStaffOnly(entry.type)`** – Domain helper used in the template to decide whether to render the "staff-only" `v-chip` badge (only when `session.can('display','Order')`).
- **`watch`** – Immediate; re-fires whenever `orderId` or `refreshKey` changes, letting the parent trigger a refresh without passing a callback.

## Relationships

- **`../domain` (`domain/index.ts` / `domain/timeline.ts`)** – Provides `describeTimelineEntry`, `isStaffOnly`, and the `TimelineTools` type. This component is the sole UI consumer of that API.
- **`../store.ts` (`useOrdersStore`)** – Source of the `fetchTimeline(orderId)` action that populates `entries`.
- **`src/modules/orders/views/Order.vue`** – Parent view; renders `<OrderTimeline>` and supplies `orderId` + `refreshKey`. The page already re-reads the order on every state change and bumps `refreshKey`, so this component follows automatically.
- **`src/modules/orders/tests/order-timeline.spec.ts`** – Unit/component tests targeting the fetch, race-guard, filtering-display, and badge logic in this file.

## Notes

- **No client-side filtering.** The server already scopes rows by role; this component never hides or reorders entries. Adding a local filter here would duplicate server logic and break the "single source of truth" contract.
- **Race guard is ticket-based, not AbortController.** A late response is silently dropped by comparing `read === latestRead`. Do not replace with `AbortController` without updating the tests, which assert the ticket behaviour.
- **`tools` object is recreated only once (setup scope).** It closes over the reactive `t`/`te` from `useI18n`, so the `lines` computed re-runs on locale switch without `tools` itself changing identity.
- **`logger.ts` is a graph neighbour but is not imported or referenced in this file**; the interaction (if any) is indirect via the store or test harness.
- **`data-test` attributes** are exhaustive and should be kept stable; the spec file and E2E suites key off them.
