# src/modules/realtime/views/RealtimePlayground.vue

## Purpose

Route view that renders the live SSE observability state from the `useRealtimeObservability` composable. It shows the current connection status, a KPI summary derived from the most recent event, and a scrollable feed of all received events with a per-entry toggle between a formatted metric grid and the raw JSON payload.

## Key elements

- **`showRawEvents`** (`ref<boolean>`) — switch that, when on, replaces each feed entry's metric grid with a `<pre>` of the full JSON payload.
- **`KIND_META`** — static map from `RealtimeMetricsEntry['kind']` (`snapshot` | `update` | `heartbeat`) to a lucide icon, Vuetify chip color, and left-border utility class.
- **`latestEntry`** (computed) — last element of `observabilityEntries`; drives the KPI tile row above the feed.
- **`feedEntries`** (computed) — `observabilityEntries` reversed so the newest event appears at the top.
- **`onUnmounted(disconnectObservability)`** — guarantees the SSE connection is torn down when the user navigates away.
- **Template** — wraps everything in `LayoutDefault`; KPI tiles use `CardMaterialStat`; the feed is a `max-h-[320px]` scrollable `role="log"` container with `tabindex="0"`.

## Relationships

- **`src/modules/realtime/routes.ts`** — registers this component as the route target for the playground path; the component is a passive view, all state lives in the composable.
- **`docs/api/asyncapi-workflow.md`** — documents the SSE contract (event kinds, payload shape) that this view renders; the `KIND_META` keys and the `RealtimeMetricsEntry` payload fields (`uptimeSeconds`, `memory.heap*`, `http.totalRequests/totalErrors`, `realtime.sseClients`) correspond to that spec.

## Notes

- The scrollable feed uses `role="log"` + `tabindex="0"` (keyboard-scrollable) rather than `aria-live` on the list itself; the live region is a separate one-line summary (`role="status"`, `aria-live="polite"`) to avoid screen readers re-announcing every card on each event.
- `KIND_META` border classes (`border-s-info`, `border-s-primary`, `border-s-secondary`) must match the project's design-system tokens; renaming those tokens will silently break the left-border accent.
- The component is purely presentational: it owns no state beyond the raw-events toggle. All connection logic lives in `useRealtimeObservability`.
