# src/modules/realtime/views/RealtimePlayground.vue

## Purpose

Route-level view that renders the live Server-Sent Events (SSE) observability stream. It exposes connection controls, a KPI summary of the most recent event, and a scrollable feed of all received metric entries with an optional raw-JSON toggle. It exists as the human-facing "playground" for the `useRealtimeObservability` composable.

## Key elements

- **`showRawEvents` (ref)** — toggles each feed entry between a formatted metric grid (`<dl>`) and a `<pre>` of `JSON.stringify(payload, null, 2)`.
- **`KIND_META`** — maps each `RealtimeMetricsEntry['kind']` (`snapshot`, `update`, `heartbeat`) to a Lucide icon, chip color, and left-border accent class.
- **`latestEntry` (computed)** — the last item in `observabilityEntries`; drives the KPI stat tiles at the top of the card.
- **`feedEntries` (computed)** — `observabilityEntries` reversed so the newest event appears first (avoids manual scroll-to-bottom).
- **`onUnmounted(disconnectObservability)`** — ensures the SSE connection is closed when the route is left.
- **KPI section** — four `CardMaterialStat` tiles (uptime, heap, requests/errors, SSE clients) populated from `latestEntry.payload`.
- **Feed section** — `role="log"`, `tabindex="0"` scroll container (max-h 320 px) with one `v-card` per entry; a `role="status"` / `aria-live="polite"` paragraph above it announces only the latest event summary (not the whole list).

## Relationships

No graph neighbors are recorded for this file. It consumes `useRealtimeObservability`, `LayoutDefault`, `CardMaterialStat`, the formatters (`formatMegabytes`, `formatTime`, `formatUptime`), and the `RealtimeMetricsEntry` type — all internal imports rather than dependency-graph edges.

## Notes

- **Accessibility is deliberate:** the feed container is focusable (`tabindex="0"`) because a scroll region without focus is unreachable by keyboard. The live region is a single-line summary, *not* the card list, to prevent screen readers from re-announcing every card on each event.
- **`toReversed()`** is used (not `.reverse()`) to avoid mutating the reactive array from the composable.
- **`KIND_META` is a plain `Record`**, not a ref/computed — it is static config, not reactive state.
- **Status chip** uses `role="status"` with a localized `aria-label` so the bare word "open"/"closed" is contextualized for assistive tech.
- All user-visible strings go through `t('realtime-playground-page.…')`; there are no hardcoded labels.
