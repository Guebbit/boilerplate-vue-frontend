---
source: src/modules/observability/types.ts
sha256: 1fcb35e0020d6f7361c10bb249e7fb222b3efda6888e0cc79465feafe6b4b804
generated_at: 2026-10-17T01:13:48.717813+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/types.ts

## Purpose
Defines the view-layer TypeScript types for the observability domain. It holds UI/composition-specific shapes (KPI cards, audit filter state, realtime feed entries, connection status) that no single API endpoint provides directly. Contract types (e.g. `ObservabilityHealth`, `AuditEntryItem`) intentionally live in `@types` (re-exports of the generated `@api` client); this file only adds the assembled view shapes on top.

## Key elements
- **`AdminTabKey`** — String-literal union (`'overview' | 'audit'`) identifying the two tabs in the Admin dashboard.
- **`AdminKpiCard`** — Interface for a single KPI card in the admin overview: `title`, `value`, optional `hint`, and optional `status` (`'ok' | 'warn' | 'error' | 'loading' | 'unknown'`) that drives icon/colour.
- **`AdminAuditFilters`** — Filter form state for the audit trail: `actor`, `action`, `outcome`, `since` (ISO timestamp lower bound), `page`, `pageSize`. All fields optional.
- **`RealtimeMetricsEntry`** — A single SSE event rendered as a feed entry: `id` (render key), `kind` (`'snapshot' | 'update' | 'heartbeat'`), `timestamp`, and `payload` (typed as `ObservabilityMetricsPayload` from `@types`).
- **`RealtimeConnectionStatus`** — Lifecycle union for the SSE connection: `'idle' | 'connecting' | 'open' | 'closed' | 'error'`.

## Relationships
- **`views/Admin.vue`** — Consumes `AdminTabKey` to switch between the overview and audit tabs.
- **`components/AdminOverviewTab.vue`** — Consumes `AdminKpiCard` to render the KPI card grid.
- **`components/AdminAuditTab.vue`** — Consumes `AdminAuditFilters` as the bound state of the audit filter form.
- **`composables/use-audit-trail.ts`** — Reads `AdminAuditFilters` to build audit-trail queries.
- **`views/RealtimePlayground.vue`** — Consumes `RealtimeMetricsEntry` and `RealtimeConnectionStatus` to drive the live feed and connection indicator.
- **`store.ts`** — May reference these types in state/action signatures.
- **`@types`** — Imported dependency; supplies `ObservabilityMetricsPayload` used inside `RealtimeMetricsEntry`.

## Notes
- **Boundary rule:** Only UI/composition types belong here. If a type mirrors a single API response, it should live in `@types` / `@api` instead. Adding contract-shaped types here is a smell.
- **`AdminKpiCard.value` is pre-formatted** (`string | number`); the view does not apply number formatting—callers must produce a display-ready value before setting it.
- **`RealtimeMetricsEntry.id`** is expected to be unique per session; it is used as a Vue `:key` for list rendering, so duplicates will cause DOM reuse issues.
