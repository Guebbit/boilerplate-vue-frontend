---
source: src/modules/observability/types.ts
sha256: 0018dadf8596db6e2bdd52bd8e78309b0e9a51be1db700a6c5435135c04ae277
signature: b56d35d10e122202ce84b4d91d5eae45de9a0a270de1bdf40b06ef6ee089c377
generated_at: 2026-11-10T04:56:44.665708+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/types.ts

## Purpose

Defines the view-layer type shapes for the observability domain—specifically the UI/composition types that the Admin dashboard and Realtime Playground assemble locally, plus the SSE feed-entry and connection-lifecycle types. It deliberately excludes contract types (e.g. `ObservabilityHealth`, `AuditEntryItem`) that live in `@types` (re-exported from the generated `@api` client), keeping this file scoped to what only the front-end layers need.

## Key elements

- **`AdminTabKey`** — Union (`'overview' | 'audit'`) identifying the two tabs in the Admin dashboard.
- **`AdminKpiCard`** — Shape of a single KPI card (title, value, optional hint, optional status badge) used in the Overview tab.
- **`AdminAuditFilters`** — Form-state shape for the Audit tab's filter bar (actor, action, outcome, since, target, ownOrder, pagination). Imports `ListAuditEntriesOutcome` from `@types` for the `outcome` field.
- **`RealtimeMetricsEntry`** — Shape of one SSE event as rendered in the feed; includes a `kind` discriminator (`'snapshot' | 'update' | 'heartbeat'`) and the `ObservabilityMetricsPayload` (from `@types`).
- **`RealtimeConnectionStatus`** — Five-state union (`'idle' | 'connecting' | 'open' | 'closed' | 'error'`) tracking the SSE lifecycle.

## Relationships

- **`src/modules/observability/views/Admin.vue`** — Consumes `AdminTabKey` to drive tab switching.
- **`src/modules/observability/components/AdminOverviewTab.vue`** — Consumes `AdminKpiCard` to render KPI cards.
- **`src/modules/observability/components/AdminAuditTab.vue`** — Consumes `AdminAuditFilters` as the local filter-form state.
- **`src/modules/observability/composables/use-audit-trail.ts`** — Consumes `AdminAuditFilters` to build query parameters.
- **`src/modules/observability/views/RealtimePlayground.vue`** — Consumes `RealtimeMetricsEntry` and `RealtimeConnectionStatus` to render the feed and connection indicator.
- **`src/modules/observability/store.ts`** — Consumes `RealtimeConnectionStatus` (and/or `RealtimeMetricsEntry`) to track shared SSE state.

## Notes

- The file is types-only (`import type` / `export type` / `export interface`); it has no runtime code.
- The split between this file and `@types` is intentional: add a type here only if it describes a **UI composition** concern (form state, render shape, local status) rather than a wire-format contract.
- `AdminAuditFilters.target` and `AdminAuditFilters.ownOrder` are documented as "Shop trail only"—they are optional and should be ignored by non-shop contexts.
- `AdminKpiCard.status` is optional; its absence means "no status badge," not an unknown state (use `'unknown'` explicitly for that).
