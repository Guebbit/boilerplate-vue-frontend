---
source: src/modules/orders/tests/order-timeline.spec.ts
sha256: 1269b387cef79729400314f4e837430673122d076f456bb095fa280051ce3767
signature: 3cccd5c79fd6ac67c440959f3f7fed755a7b8150bff1301671417b31c603fec4
generated_at: 2026-11-10T05:03:08.809720+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/order-timeline.spec.ts

## Purpose

Unit tests for the `OrderTimeline.vue` component in isolation. Verifies what the component renders for a staff viewer versus a buyer, the "own order" chip, refetch-on-change behavior, error display, the staff note form (add, fail, empty), and note-text withdrawal. The store's `fetchTimeline` call is always mocked; the server's per-caller filtering is treated as the API's job, so the buyer case simply hands the component pre-filtered rows and asserts nothing extra appears.

## Key elements

- **`STAFF_ROWS`** / **`BUYER_ROWS`** — fixture arrays of `OrderTimelineEntry`. `BUYER_ROWS` is derived from the staff rows (staff-only entry removed, `actor` stripped) to simulate what the API would return to a buyer.
- **`signIn(staff, canWrite?)`** — helper that populates the session store with `display:Order` (staff) or `read:Order` (buyer) abilities, optionally adding `update:Order`.
- **`pageOf(items, page?, totalPages?)`** — wraps rows in the paginated response shape the component expects.
- **`mountTimeline(rows, ownerId?)`** — mounts `OrderTimeline` with a spied `fetchTimeline` resolving to `pageOf(rows)`; returns the wrapper and the spy after `flushPromises`.
- **`describe` blocks:**
  - *Staff view* — renders all rows, actor, note text, and the `staff-only` badge only on staff-audience rows.
  - *Own money* — chips rows whose `actor` matches the `ownerId` prop; no chip for strangers, no buyer, or absent buyer.
  - *Buyer view* — shows exactly the rows given, no actor, no staff badge; empty-state message when zero rows.
  - *Reading* — refetches only when `refreshKey` changes; on a rejected fetch, renders an error block instead of the empty state.
  - *Leaving a staff note* — form visibility gated on `update:Order`; trims text, clears textarea, refetches on success; on failure keeps text and shows inline error; blank/whitespace-only input does not call `addNote`.
  - *Withdrawing a note's text* — withdraw button appears only on `note_added` rows that still have `text`, and only for holders of `update:Order`.

## Relationships

- **`src/modules/orders/components/OrderTimeline.vue`** — the component under test; mounted directly and driven via `data-test` attribute queries.
- **`src/modules/orders/store.ts`** — `useOrdersStore().fetchTimeline` and `.addNote` are spied and mocked; no real store logic is exercised here.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register i18n/session infrastructure required by the component mount.

## Notes

- The component does **not** filter rows by audience itself; the test relies on the API having done so. Passing the wrong rows is a test-authoring concern, not a component concern.
- `refreshKey` is the sole refetch trigger — changing any other prop does **not** cause a re-read. Tests assert call-count stability across unrelated prop changes.
- The staff note form requires **both** `display:Order` and `update:Order` abilities; staff with only `display` see no form.
- All DOM queries use `data-test="order-timeline-*"` attributes rather than CSS classes or text content, keeping the tests decoupled from presentational markup.
- The file is truncated in the provided excerpt; the "withdrawing a note's text" block likely contains additional cases beyond what is shown.
