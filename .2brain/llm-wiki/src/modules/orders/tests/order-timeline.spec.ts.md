---
source: src/modules/orders/tests/order-timeline.spec.ts
sha256: 3f5eb11783c7f5d412c10eccf3867f6e6370902cabbdd0047167a07ce719d548
generated_at: 2026-10-17T01:17:57.508015+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/order-timeline.spec.ts

## Purpose
Unit tests for the `OrderTimeline` Vue component in isolation. Verifies the rendered output for staff vs. buyer ability contexts (which rows appear, whether actor names and staff-only badges show) and confirms the component re-fetches its timeline only when the `refreshKey` prop actually changes. The store's network call is always mocked; correctness of the fetch itself is covered elsewhere.

## Key elements
- **`STAFF_ROWS`** — Fixture array of three `OrderTimelineEntry` objects (created, paid, status_overridden) with `actor` and `text` fields, representing what the API returns to a staff viewer.
- **`BUYER_ROWS`** — Derived from `STAFF_ROWS` by slicing to the first two entries and stripping the `actor` field; represents the buyer's (already-filtered) payload.
- **`signIn(staff: boolean)`** — Helper that populates the session store's `abilities` with either a `display:Order` rule (staff) or a `read:Order { userId }` rule (buyer), then sets a fake token and viewer.
- **`mountTimeline(rows)`** — Spies on `useOrdersStore().fetchTimeline` to resolve with the given rows, mounts `OrderTimeline` with Vuetify + i18n plugins, and returns the wrapper after `flushPromises`.
- **`describe('staff view')`** — Asserts all three rows render with correct `data-type`, actor text, note text, and that the staff-only badge appears only on the `status_overridden` row.
- **`describe('buyer view')`** — Asserts two rows render, no actor element exists, no staff-only badge exists, and an empty array yields the `order-timeline-empty` sentinel.
- **`describe('reading')`** — Asserts `fetchTimeline` is called exactly once on mount, not re-called when `refreshKey` stays the same, and called a second time when it changes. Also asserts a rejected fetch surfaces the error message in `order-timeline-error` rather than falling through to the empty state.

## Relationships
- **`src/modules/orders/components/OrderTimeline.vue`** — The component under test; all assertions target its rendered DOM (`data-test` attributes) and its reaction to the `orderId` / `refreshKey` props.
- **`src/modules/orders/store.ts`** — Provides `useOrdersStore().fetchTimeline`, which is always `vi.spyOn`'d and mocked in every test; the store's own call logic is tested in `store.spec.ts`.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope (outside any `beforeEach`) to register shared module wiring the test environment expects.

## Notes
- `BUYER_ROWS` is not independently authored; it is `STAFF_ROWS.slice(0, 2)` with `actor` destructured out. If you add a staff-only entry type, it will not leak into the buyer fixture automatically.
- The error-path test mounts the component directly (without `mountTimeline`) so it can install a *rejecting* spy rather than a resolving one.
- `wireModulesIntoCore()` runs at import time, not per-test. If another spec in the same process re-wires, it could interfere; rely on Vitest's per-file module isolation.
- The `refreshKey` re-fetch assertion depends on the component using a `watch` (or equivalent) that compares by value—passing the *same* string does not trigger a second fetch.
