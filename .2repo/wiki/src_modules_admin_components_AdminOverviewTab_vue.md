# src/modules/admin/components/AdminOverviewTab.vue

## Purpose

Presentational tab for the admin dashboard overview. It renders KPI cards, auth/business metric summaries, and system-info rows derived entirely from `health` and `metrics` payloads passed in via props. It owns no data-fetching state; the parent component supplies the payloads and their loading/error flags.

## Key elements

- **Props** — `health`, `metrics`, `loading`, `healthError`, `metricsError`; all display data is read from these, nothing is stored locally.
- **`kpiCards` (computed)** — Builds the array of 10 KPI cards (API status, database, cache, queue, uptime, requests, errors, error rate, p50, p95) with title, value, hint, and status for each.
- **`healthStatus` / `errorRateStatus` (computed)** — Map raw payload values onto the four-state `AdminKpiCard['status']` union (`loading | error | unknown | ok | warn`).
- **`dependencyStatus` (function)** — Maps a single backing-service state string to a card status. `disabled` is intentionally treated as `ok`.
- **`formatErrorRate` (function)** — Converts a 0–1 ratio to a percentage string or returns `EMPTY_VALUE`.
- **`kpiDotClass` / `kpiStatusText` (functions)** — Translate a card status into a Tailwind background class and a localised label respectively.
- **`flag` / `flagText` (functions)** — Render a boolean integration indicator as ✓/✗ plus an accessible label.
- **Template** — Refresh button (emits `refresh`), responsive KPI card grid, and three conditional `<v-card>` sections (auth, business, system) using `DefinitionRow` for key-value pairs.

## Relationships

No graph neighbors are recorded for this file. It imports shared formatters (`formatUptime`, `formatMegabytes`, `formatTime`, `EMPTY_VALUE`), the `DefinitionRow` UI molecule, and the `AdminKpiCard` type, but no other component in the dependency graph is listed as a neighbor.

## Notes

- **Tailwind JIT gotcha:** `kpiDotClass` returns full literal class names (`bg-success`, `bg-warning`, etc.) instead of building them with a template literal. Tailwind's scanner only emits utilities it can see spelled out in source; a dynamic `bg-${x}` string would produce no CSS and the dot would be invisible.
- **`disabled` ≠ warning:** A deployment that omits Redis or RabbitMQ reports those dependencies as `disabled`. The component maps that to `ok` so the card stays green rather than permanently amber.
- **Accessibility:** Every status dot carries `aria-hidden="true"` and is paired with an `sr-only` span containing the localised status word. Boolean flags similarly pair a glyph with `flagText`.
- **No fetching here:** The component emits `refresh` but performs no HTTP calls; the parent owns data retrieval and re-passes fresh props.
