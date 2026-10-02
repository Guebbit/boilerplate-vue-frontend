---
source: src/modules/observability/views/RealtimePlayground.vue
sha256: af7b578473aabf8f31a70eaf5f9818ed824555bd8b73cfba10aecb7d0be2c2d1
generated_at: 2026-10-02T15:20:23.395846+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/views/RealtimePlayground.vue

## Purpose
Route view that renders the live SSE observability stream: connection status, a KPI summary of the latest event, and a scrollable feed where each entry can display either a formatted metric grid or the raw JSON payload. It exists as the human-facing "playground" page for inspecting realtime metrics without any external tooling.

## Key elements

- **`showRawEvents` (ref)** — toggles feed entries between the metric `<dl>` grid and a `<pre>` block showing `JSON.stringify(entry.payload, null, 2)`.
- **`KIND_META`** — static lookup mapping each `RealtimeMetricsEntry['kind']` (`snapshot`, `update`, `heartbeat`) to a lucide icon, Vuetify chip color, and left-border accent class.
- **`latestEntry` (computed)** — the most recent entry in the SSE buffer; drives the four `CardMaterialStat` KPI tiles (uptime, heap, requests/errors, SSE client count).
- **`feedEntries` (computed)** — `observabilityEntries` reversed so the newest event appears first (avoids the reader scrolling down on every new event).
- **`onUnmounted(disconnectObservability)`** — ensures the SSE connection is torn down when the user navigates away, preventing a lingering socket for the rest of the session.
- **`useRealtimeObservability()`** — provides `status`, `entries`, `connect`, and `disconnect` for the SSE stream; the component is a pure consumer of that state.

## Relationships

No graph neighbors are recorded for this file. At runtime it depends on:

- `useRealtimeObservability` composable (source of all SSE state and controls).
- `CardMaterialStat` UI organism (renders each KPI tile).
- `formatUptime`, `formatMegabytes`, `formatTime` formatters (display helpers).
- `RealtimeMetricsEntry` type (shapes the feed payload).

## Notes

- The feed container has `role="log"` and `tabindex="0"` so keyboard users can focus and scroll it; the live-region summary line (`role="status"`, `aria-live="polite`) is deliberately separate from the list to avoid re-announcing every card on each event.
- `data-test` attributes (`realtime-status`, `realtime-connect`, `realtime-disconnect`, `realtime-raw-events`, `realtime-requests`, `realtime-feed-summary`) are the hooks for E2E tests — keep them stable.
- The feed is capped at `max-h-[320px]` with `overflow-y-auto`; it does not virtualize, so very long sessions will accumulate DOM nodes.
- All user-visible strings go through `t()` with keys under the `realtime-playground-page.*` namespace.
