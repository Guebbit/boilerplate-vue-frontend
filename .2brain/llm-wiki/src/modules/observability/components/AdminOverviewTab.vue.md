---
source: src/modules/observability/components/AdminOverviewTab.vue
sha256: e96ead3a522836ac36109056e5253a5a416755fd19be7eba35b7b69ac9424c5a
signature: a4f00c2c8ea3d36eadb97b274b4a602df385990764899cbce7a5cc15212c0b98
generated_at: 2026-11-10T04:51:38.028968+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/components/AdminOverviewTab.vue

## Purpose

Presentational "Overview" tab of the admin observability dashboard. It receives pre-fetched health and metrics payloads from the parent view, derives every KPI card's value, status colour, and accessible text via pure computed functions, and renders the grid of cards plus the auth / business / system info sections. It performs no data fetching of its own — it only emits `refresh` and lets the parent own the network calls.

## Key elements

- **`props`** — `health`, `metrics`, `loading`, `healthError`, `metricsError`; all data ownership stays with the parent.
- **`emit('refresh')`** — signals the parent to re-fetch; the component never fetches itself.
- **`formatErrorRate(rate?)`** — converts a 0–1 ratio to a one-decimal percentage string, or `EMPTY_VALUE` when undefined.
- **`healthStatus`** (computed) — priority chain: `loading` → `error` → `unknown` → `ok`/`warn`.
- **`dependencyStatus(state?)`** — maps a single dependency's state string to a KPI status. `disabled` is intentionally treated as `ok`, not a warning.
- **`DEPENDENCY_KEYS`** — ordered tuple `['database', 'cache', 'queue']`, also used as i18n key suffixes.
- **`dependencyCards`** (computed) — one `AdminKpiCard` per dependency, built from `DEPENDENCY_KEYS`.
- **`errorRateStatus`** (computed) — threshold logic: >10 % → `error`, >2 % → `warn`, else `ok`; `unknown` when no metrics.
- **`kpiCards`** (computed) — the full ordered array of KPI cards (API status, three dependencies, uptime, requests, errors, error rate, p50/p95 latency).
- **`KPI_DOT_CLASSES`** — `as const` object mapping each status to a **literal** Tailwind background class (e.g. `bg-success`), so Tailwind's static scanner picks them up.
- **`kpiDotClass` / `kpiStatusText`** — resolve a card's status to its dot class and its screen-reader text respectively.
- **`flag` / `flagText`** — boolean → `✓`/`✗` glyph and localised "Enabled"/"Disabled" text for integration rows.
- **Template** — refresh button, responsive KPI card grid, and three conditional `<v-card>` sections (auth metrics, business metrics, system info) rendered with `DefinitionRow`.

## Relationships

- **`src/modules/observability/types.ts`** — imports the `AdminKpiCard` interface used to type every computed card array in this component.
- **`src/modules/observability/views/Admin.vue`** — parent view that supplies all props (`health`, `metrics`, `loading`, error strings) and handles the `refresh` emit by performing the actual fetch calls.
- **`src/modules/observability/tests/admin-overview-tab.spec.ts`** — unit-test spec that exercises the status derivation logic (`healthStatus`, `dependencyStatus`, `errorRateStatus`) and template rendering.

## Notes

- **`disabled` ≠ warning.** A dependency reported as `disabled` is mapped to `ok` on purpose: a deployment that omits Redis or RabbitMQ is a valid configuration, and amber would permanently alarm those deployments.
- **Tailwind class constraint.** `KPI_DOT_CLASSES` uses full literal class names (`bg-success`, `bg-warning`, …) rather than a template-literal like `bg-${status}`. Tailwind's scanner only generates utilities for class strings it can see verbatim in source, so dynamic names would produce no CSS. The `as const` top-level object also lets the Tailwind lint plugin detect the strings.
- **Error-rate thresholds are hard-coded** at 10 % (error) and 2 % (warn) in `errorRateStatus`; there is no config or prop to override them.
- **Uptime card** falls back from `health.uptimeSeconds` to `metrics.process.uptimeSeconds`, so it renders even when only one payload loaded.
- The component is fully passive: every piece of data flows in through props and the only outward signal is the single `refresh` event.
