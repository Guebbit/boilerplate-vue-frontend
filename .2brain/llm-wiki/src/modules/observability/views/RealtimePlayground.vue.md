---
source: src/modules/observability/views/RealtimePlayground.vue
sha256: 45c8903e87094bc393bc22e8ce0bc916e4b71b285a2031c8a0cab1c2052c02b1
generated_at: 2026-10-17T01:14:29.163363+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/views/RealtimePlayground.vue

## Purpose

Route view that renders the live SSE observability stream: a connection-status chip with connect/disconnect controls, KPI tiles for the most recent event (uptime, heap, requests, SSE clients), and a scrollable feed of entries that can toggle between a formatted metric grid and raw JSON.

## Key elements

- **`useRealtimeObservability()`** destructured into `observabilityStatus`, `observabilityEntries`, `connectObservability`, `disconnectObservability` — the sole source of SSE state and lifecycle controls.
- **`showRawEvents`** (`ref<boolean>`) — toggles each feed card between a `<dl>` metric grid and a `<pre>` with `JSON.stringify(entry.payload, null, 2)`.
- **`KIND_META`** — maps each `RealtimeMetricsEntry['kind']` (`snapshot`, `update`, `heartbeat`) to a lucide icon, chip color, and left-border accent class.
- **`latestEntry`** (computed) — last item in the entries array; drives the KPI tile row.
- **`feedEntries`** (computed) — entries reversed so newest appears first in the scrollable feed.
- **`onUnmounted(disconnectObservability)`** — guarantees the SSE connection is torn down when the view is navigated away.
- **Template sections** — status chip (`role="status"`), control buttons (`data-test="realtime-connect"` / `realtime-disconnect`), KPI grid via `CardMaterialStat`, and a `role="log"` feed container with `tabindex="0"` for keyboard access.

## Relationships

- **`../use-realtime-observability.ts`** — provides the composable whose `status`, `entries`, `connect`, and `disconnect` members are the only reactive state this view reads or acts on.
- **`../types.ts`** — supplies the `RealtimeMetricsEntry` type used to type `KIND_META` and to shape all payload field accesses in the template.

## Notes

- The feed is rendered **newest-first** via `.toReversed()`; there is no virtualization — the list is capped at `max-h-[320px]` with `overflow-y-auto`.
- Accessibility: the live-region summary is a single `<p role="status" aria-live="polite">` line, deliberately kept **outside** the card list to avoid re-announcing every card on each event. The scroll container carries `role="log"` and `tabindex="0"`.
- All user-facing strings go through `t()` (vue-i18n); the i18n namespace is `realtime-playground-page.*`.
- `data-test` attributes (`realtime-status`, `realtime-connect`, `realtime-disconnect`, `realtime-raw-events`, `realtime-requests`, `realtime-feed-summary`) are the stable selectors for E2E tests.
