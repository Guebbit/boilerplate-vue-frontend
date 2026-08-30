# docs/api/observability.md

## Purpose

Documents the four backend observability endpoints (health, metrics overview, audit log, SSE events) and the frontend Admin Dashboard implementation that consumes them. Exists so developers and AI assistants can reference response shapes, auth requirements, and the FE composable layout without opening the source files.

## Key elements

- **`GET /observability/health`** (admin JWT) — service status, DB connectivity, uptime, memory, integration booleans (Loki, OTEL, Umami, Faro).
- **`GET /observability/metrics/overview`** (admin JWT) — HTTP totals, error rate, in-flight count, latency p50/p95, auth counters, business counters.
- **`GET /observability/audit`** (admin JWT) — paged audit events; supports `actor`, `action`, `outcome`, `since`, `limit` query params (limit 1–200, default 50).
- **`GET /observability/events`** (no auth) — SSE stream for live metrics; consumed by the `realtimeObservability` store, **not** the Admin Dashboard.
- **`use-admin-observability.ts`** (`src/modules/admin/composables/`) — single composable that fetches the three REST endpoints and exposes reactive refs for the view.
- **`src/modules/admin/types.ts`** — FE view-model types: `IAdminKpi`, `IAdminAuditFilters`.
- **Generated REST types** (`contracts/rest/index.ts`) — `ObservabilityHealth`, `ObservabilityMetricsSummary`, `AuditEventItem`, etc., derived from `openapi.yaml`.

## Relationships

- **`docs/api/endpoints.md`** — listed as a related page; holds the broader REST endpoint catalog of which the observability routes are a subset.
- **`CHANGELOG.md`** and **`docs/api/asyncapi-workflow.md`** appear in the dependency graph but are not referenced or consumed by this file's content.

## Notes

- The SSE endpoint (`/observability/events`) is the **only** observability route that requires no auth; the other three all demand an admin JWT.
- The Admin Dashboard does **not** consume the SSE stream — that stream feeds the separate `RealtimePlayground` view via its own store.
- FE view-model types (`IAdminKpi`, `IAdminAuditFilters`) are hand-written in `src/modules/admin/types.ts` and are distinct from the OpenAPI-generated types in `contracts/rest/index.ts`. Do not conflate the two.
- Audit query params map 1:1 from the `IAdminAuditFilters` reactive state; there is no server-side pagination beyond `limit`.
