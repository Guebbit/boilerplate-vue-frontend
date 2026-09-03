# src/modules/admin/components/AdminOverviewTab.vue

## Purpose

Presentational tab for the admin dashboard that renders a row of KPI status cards (API health, dependencies, uptime, request/error counts, latency percentiles) plus auth and business metric sections. It derives every displayed value and status colour from `health` and `metrics` payloads passed in as props; it performs no fetching and holds no internal state.

## Key elements

- **Props** — `health`, `metrics`, `loading`, `healthError`, `metricsError`; all data the tab displays arrives from the parent.
- **`emit('refresh')`** — signals the parent to re-fetch; the component itself never calls an API.
- **`kpiCards` (computed)** — the single source of truth for the card grid; each entry carries `title`, `value`, optional `hint`, and a `status` that drives the dot colour and sr-only text.
- **`healthStatus` / `errorRateStatus` (computed)** — map raw prop state to the four-level `AdminKpiCard['status']` vocabulary (`ok | warn | error | loading | unknown`).
- **`dependencyStatus(state)`** — maps a single backing-service state string to a card status; treats `'disabled'` as `ok` (a supported configuration, not a warning).
- **`kpiDotClass(status)`** — returns a **literal** Tailwind background class (`bg-success`, `bg-warning`, `bg-error`, `bg-info`, `bg-secondary`) via a lookup object.
- **`kpiStatusText(status)`** — localised word for screen-reader users alongside the colour dot.
- **`flag` / `flagText`** — render a boolean integration as ✓/✗ glyph plus localised Enabled/Disabled.
- **Template sections** — KPI card grid, optional auth-metrics card, optional business-metrics card, and a system-info card (environment, memory, CPU, etc.) rendered with `DefinitionRow`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Tailwind dynamic-class pitfall:** `kpiDotClass` returns full literal strings from a lookup object instead of building `bg-${color}` — the Tailwind scanner only emits utilities for class names it can see written in source, so a template-literal name would produce no CSS at all.
- **`disabled` ≠ warning:** A dependency reported as `disabled` (e.g. Redis or RabbitMQ intentionally absent) is mapped to `ok`, not `warn`, to avoid a permanently amber card on valid deployments.
- **Uptime fallback:** The uptime card reads `health.uptimeSeconds` first, then falls back to `metrics.process.uptimeSeconds`; both may be absent, in which case `formatUptime` receives `undefined`.
- **Pure-derivation contract:** Every dot colour and glyph is a pure function of the props; the component intentionally has nothing of its own to keep in sync with an external store or timer.
