---
source: src/modules/orders/components/OrderTimeline.vue
sha256: 15ab27db689c17a58409ae18e2c4b2d3b0787ffd85182393adabbf4adb0aaf77
signature: 15ab27db689c17a58409ae18e2c4b2d3b0787ffd85182393adabbf4adb0aaf77
generated_at: 2026-11-10T04:57:57.695523+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/components/OrderTimeline.vue

## Purpose

Renders the order page's event history: a newest-first list of timeline entries with "show older" pagination, an optional staff-note form, and per-row actions (remove note text). Server-side filtering determines what each caller sees; this component displays rows as-is and adds only presentation chrome (badges, chips, i18n strings).

## Key elements

- **`describeTimelineEntry(entry, tools)`** (imported from `../domain`) — builds the human-readable display line (including a `title` field) for each row from its ids/codes.
- **`tools: TimelineTools`** — binds the app's i18n translator, `formatCurrency`, `formatDay`, `formatUtcDate` into the shape `describeTimelineEntry` expects.
- **`load()`** — fetches the newest page via `useOrdersStore().fetchTimeline(orderId)`, replacing all previously loaded rows. Guards against stale responses with a `latestRead` counter.
- **`showOlder()`** — appends the next older page; deduplicates by `entry.id` because offset paging on a head-growing list can repeat rows.
- **`saveNote()`** — posts a staff note through the store, then calls `load()` so the new row appears.
- **`removeNoteText(eventId)`** — deletes the text of a `note_added` row (the row itself persists), then reloads.
- **`isByBuyer(entry)`** — returns `true` when `entry.actor === props.ownerId`, driving the "own order" chip for staff.
- **`lines` (computed)** — maps loaded entries to `{ entry, line, text }` tuples; re-evaluates on row or locale change.
- **`watch([orderId, refreshKey], load, { immediate: true })`** — initial read and reload whenever the owning page signals a state change.

## Relationships

- **`src/modules/orders/domain/index.ts`** — provides `describeTimelineEntry` and the `TimelineTools` type used to render each row's text.
- **`src/modules/orders/domain/timeline.ts`** — underlying implementation of the domain helpers re-exported by the domain barrel.
- **`src/modules/orders/store.ts`** — `useOrdersStore()` exposes `fetchTimeline`, `addNote`, and `deleteNote`, the three API calls this component makes.
- **`src/modules/orders/views/OrderTarget.vue`** — parent view that mounts this component, supplying `orderId`, `refreshKey`, and `ownerId`.
- **`src/modules/orders/tests/order-timeline.spec.ts`** — unit/integration tests covering pagination, note save/remove, and permission-gated rendering.

## Notes

- The component name block (`export default { name: 'OrderTimeline' }`) exists solely so `<KeepAlive>` and devtools can identify the SFC; `<script setup>` cannot declare a name itself.
- `loading` is derived (`entries === undefined && !readError`), not a boolean flag — a refresh that fails keeps the existing rows visible and never re-shows the loading text.
- `showOlder` deduplicates by id; the server's offset paging can repeat a row if new entries were inserted at the head between page reads.
- The `latestRead` monotonic counter discards in-flight responses when a newer `load()` supersedes them (e.g., a `refreshKey` change mid-flight).
- The note textarea enforces `maxlength="2000"` in the template; the server may still reject (rate limit, etc.), surfaced via `noteError`.
- `logger.ts` appears in the dependency graph but is **not** imported by this file — no direct interaction to document.
