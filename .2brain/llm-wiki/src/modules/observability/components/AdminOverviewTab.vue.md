---
source: src/modules/observability/components/AdminOverviewTab.vue
sha256: 5986eecc5ed4bde90121fb07e9ac324115438878a80d48f1154086f4ef372eac
generated_at: 2026-10-17T01:11:04.035620+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/components/AdminOverviewTab.vue

## Purpose

Presentational "Overview" tab of the admin observability dashboard. It receives already-fetched health and metrics payloads as props and derives every displayed KPI card (value, status colour, hint) from them. It owns no data-fetching state; all network I/O lives in the parent view.

## Key elements

- **Props** (`health`, `metrics`, `loading`, `healthError`, `metricsError`) — the data contract; all optional except `loading`. The parent is responsible for populating them.
- **`emit('refresh')`** — the only outbound signal; the refresh button in the template fires it and the parent performs the fetch.
- **`kpiCards`** (computed, `AdminKpiCard[]`) — the single source of truth for the card grid. Ten cards covering API status, database, cache, queue, uptime, total requests, total errors, error rate, p50 and p95 latency.
- **`healthStatus` / `errorRateStatus` / `dependencyStatus`** — pure status-mapping helpers that translate raw API values into the `loading | error | unknown | ok | warn` vocabulary used by the dot colour.
- **`kpiDotClass(status)`** — maps a status to a *literal* Tailwind `bg-*` class (see Notes).
- **`kpiStatusText(status)`** — localised screen-reader text for each status.
- **`flag` / `flagText`** — render a boolean integration toggle as ✓/✗ plus localised "Enabled"/"Disabled" text.
- **Template sections** — refresh button + last-updated timestamp, the auto-fit KPI card grid, and three conditional detail cards (Auth, Business, System) that render `DefinitionRow` lists.

## Relationships

- **`src/modules/observability/views/Admin.vue`** — Parent view. Owns the fetch lifecycle, passes `health`/`metrics`/`loading`/error props down, and listens for the `refresh` event. This component is one of its tab children.
- **`src/modules/observability/types.ts`** — Supplies the `AdminKpiCard` interface (title, value, status, hint) that `kpiCards` computes into and that the template iterates over.
- **`src/modules/observability/tests/admin-overview-tab.spec.ts`** — Unit tests that exercise the computed status logic, KPI card derivation, and template rendering against various prop combinations.

## Notes

- **Tailwind JIT constraint:** `kpiDotClass` returns full literal class strings (`'bg-success'`, `'bg-error'`, etc.) instead of building `bg-${color}`. Tailwind's source scanner cannot see dynamically-constructed names, so a template-literal approach would produce a dot with no background colour.
- **`disabled` dependency = `ok`:** `dependencyStatus` intentionally maps the string `'disabled'` to `ok`. A deployment that omits Redis or RabbitMQ is a valid configuration; painting it amber would make the card permanently yellow on those deployments.
- **Error-rate thresholds are hard-coded:** > 10 % → `error`, > 2 % → `warn`, otherwise `ok`. There is no external config; adjust in `errorRateStatus` if thresholds change.
- **No local data state:** The component is purely a function of its props. Adding local `ref`/`reactive` data here would break the "nothing to keep in sync" invariant stated in the module doc-block.
- **Accessibility:** Every status dot is `aria-hidden`; the adjacent `<span class="sr-only">` provides the localised status word for screen-reader users.
