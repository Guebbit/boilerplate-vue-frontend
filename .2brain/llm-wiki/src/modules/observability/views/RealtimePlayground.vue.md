---
source: src/modules/observability/views/RealtimePlayground.vue
sha256: e5635cec7a90c7d7ac579f1db3ff56b8b1db77fd4fb9b99a30de4fc20c8e64d5
signature: e5635cec7a90c7d7ac579f1db3ff56b8b1db77fd4fb9b99a30de4fc20c8e64d5
generated_at: 2026-11-10T04:57:32.193109+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/views/RealtimePlayground.vue

## Purpose

Route-level view that renders the live SSE observability stream: a connection status indicator, connect/disconnect controls, KPI tiles summarising the latest event (uptime, heap, HTTP requests, SSE clients), and a scrollable, newest-first feed of individual events with a toggle between a formatted metric grid and raw JSON.

## Key elements

- **`KIND_META`** — maps each `RealtimeMetricsEntry['kind']` (`snapshot`, `update`, `heartbeat`) to a lucide icon, Vuetify chip colour, and a CSS class for the left-edge stripe (used because Vuetify's `border` colour is uniform on all sides).
- **`showRawEvents`** (`ref<boolean>`) — toggles the feed body between a `<dl>` metric grid and a `<pre>` of `JSON.stringify(entry.payload)`.
- **`latestEntry`** (`computed`) — last element of the entries array; drives the KPI tile section above the feed.
- **`feedEntries`** (`computed`) — `entries.toReversed()` so the newest event appears first.
- **`onUnmounted(disconnectObservability)`** — ensures the SSE connection is closed when the user navigates away.

## Relationships

- **`src/modules/observability/types.ts`** — imports `RealtimeMetricsEntry`; the `KIND_META` record and all template property accesses (`entry.kind`, `entry.payload.*`, `entry.id`, `entry.timestamp`) are typed against it.
- **`src/modules/observability/use-realtime-observability.ts`** — the sole data source; destructures `status`, `entries`, `connect`, and `disconnect` into the template and the unmount hook.

## Notes

- The component name (`RealtimePlaygroundPage`) is declared in a separate `<script>` block because `<script setup>` cannot set `name`; this is required for `<KeepAlive>` / devtools.
- The scrollable feed container has `tabindex="0"` and `role="log"` to remain keyboard-accessible; the single-line summary above it carries `aria-live="polite"` (a live region over the full card list would re-announce every card on each event).
- The left-edge colour stripe is a dedicated `<span>` with `absolute` positioning rather than a CSS border, specifically to work around Vuetify's single-value border-colour API.
- All user-facing strings go through `useI18n().t()` with keys namespaced under `realtime-playground-page.*`.
