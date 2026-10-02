---
tags:
  - 2brain
  - 2brain/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/observability/
files: 25
updated: 2026-10-02T19:29:10.103831+00:00
---

# src/modules/observability/

## Purpose

The observability module provides the admin-facing dashboards and tools for monitoring application health: an overview dashboard with KPI cards (including parked-jobs/queues), an audit-log viewer scoped by target, and a realtime SSE playground for inspecting live metrics streams. It owns its own routes, store, type definitions, and API response schemas end-to-end.

## Key parts

- **Module definition & routing** — `module.ts`, `routes.ts`, `store.ts`, `types.ts`, `response-schemas.ts` declare the module's exports, URL structure (admin, audit, realtime), shared Pinia store, domain types, and validated API response shapes.
- **Views (page shells)** — `views/Admin.vue` (tabbed dashboard: overview + audit), `views/AuditLog.vue` (deep-linkable audit history), and `views/RealtimePlayground.vue` (live SSE feed with KPI summary and per-event metric/JSON display).
- **Tab components** — `components/AdminOverviewTab.vue` (KPI cards incl. parked-jobs/queues) and `components/AdminAuditTab.vue` (self-fetching audit table with filter form); both render declaratively from props supplied by their parent view.
- **Composables (data logic)** — `composables/use-admin-observability.ts` (parallel fetchers for overview panels, per-panel error isolation, token-purge action), `composables/use-audit-trail.ts` (endpoint routing, `target` filter merging, envelope splitting), and `use-realtime-observability.ts` (SSE connection lifecycle and event buffering).
- **Tests** — Unit specs cover each composable's contract, each tab's fetch/filter behavior, route parameter forwarding, and store actions. E2E specs (`tests/e2e/`) include a co-located a11y sweep, visual regression for the admin page, and a realtime-stream smoke test.

## How it connects

The module is a leaf in the dependency graph: it imports only from the repository root (shared utilities, HTTP client, and framework primitives) and is not imported by any other feature module. Cross-cutting tests at the root (e.g., `tests/cross-cutting/a11y-coverage.spec.ts`) assert that this module's a11y file exists, but that is a test-time check, not a runtime dependency.

## Where to start

Read `views/Admin.vue` first—it is the primary entry point and shows how the overview and audit tabs are composed, what shared data is fetched on mount, and how the token-purge flow is dispatched. Then read `composables/use-admin-observability.ts` to understand the data-fetching contract (parallel panel fetches, per-panel error isolation) that the overview tab relies on.

## Connected modules
[[boilerplate-vue-frontend_ROOT|/ (repository root)]]

## Files
- `src/modules/observability/components/AdminAuditTab.vue`
- `src/modules/observability/components/AdminOverviewTab.vue`
- `src/modules/observability/composables/use-admin-observability.ts`
- `src/modules/observability/composables/use-audit-trail.ts`
- `src/modules/observability/module.ts`
- `src/modules/observability/response-schemas.ts`
- `src/modules/observability/routes.ts`
- `src/modules/observability/store.ts`
- `src/modules/observability/tests/admin-audit-tab.spec.ts` — Vitest spec for `AdminAuditTab.vue` that covers the self-fetching behavior not exercised by `use-audit-trail.spec.ts`: verifying that mounting the component triggers the correct initial API call per `endpoint` prop, that the `target` prop is forwarded into shop-tenant requests, and that submitting the filter form re-fetches through the same endpoint with the query parameters applied.
- `src/modules/observability/tests/admin-overview-tab.spec.ts` — Unit test suite (Vitest + Vue Test Utils) for the **parked-jobs / queues** card rendered inside `AdminOverviewTab.vue`. It was added as part of the CLEANUP_0917 work item and is intentionally scoped to that one section; every other KPI or section on the tab is out of scope.
- `src/modules/observability/tests/audit-log-view.spec.ts` — Unit test for `AuditLog.vue` that verifies the view reads the `target` query parameter off the URL and forwards it (or its absence) to `AdminAuditTab`. It proves that a "History" deep-link (`?target=o1`) and the plain `/audit` nav entry both resolve to the same page, scoped correctly. `AdminAuditTab` is fully stubbed; its data-fetching logic is covered by `admin-audit-tab.spec.ts`.
- `src/modules/observability/tests/e2e/a11y.cy.ts` — Co-located accessibility (a11y) sweep configuration for the observability module's own routes. It exists per-module so that deleting the module automatically removes its a11y coverage, and a cross-cutting spec (`tests/cross-cutting/a11y-coverage.spec.ts`) asserts every routed module has one of these files to prevent silent loss of domain coverage.
- `src/modules/observability/tests/e2e/admin.visual.cy.ts`
- `src/modules/observability/tests/e2e/realtime.cy.ts`
- `src/modules/observability/tests/e2e/realtime.visual.cy.ts`
- `src/modules/observability/tests/routes.spec.ts`
- `src/modules/observability/tests/store.spec.ts`
- `src/modules/observability/tests/use-admin-observability.spec.ts` — Unit tests for the `useAdminObservability` composable. The file asserts the **composition contract**: each fetcher writes only its own slice of state, a dead endpoint degrades to a per-panel error message without blocking the panel that answered, and the sole write action (`clearExpiredTokens`) rejects rather than swallowing. Loading/error bookkeeping and the audit trail are explicitly out of scope (see `use-async-action.spec.ts` and `use-audit-trail.spec.ts`).
- `src/modules/observability/tests/use-audit-trail.spec.ts` — Unit tests for the `useAuditTrail` composable, verifying that each `endpoint` value routes to the correct API contract, that the `target` filter is merged into shop requests but excluded from platform requests, that the response envelope is split into `entries`/`total`/`pages`, and that a failed call degrades to an `error` string rather than rejecting.
- `src/modules/observability/tests/use-realtime-observability.spec.ts`
- `src/modules/observability/types.ts`
- `src/modules/observability/use-realtime-observability.ts`
- `src/modules/observability/views/Admin.vue` — Admin dashboard shell for the observability module. Owns the active-tab state (overview vs. audit), fetches shared health/metrics data on mount, and dispatches the token-purge confirmation + toast. The two tab components render declaratively from props this view supplies.
- `src/modules/observability/views/AuditLog.vue`
- `src/modules/observability/views/RealtimePlayground.vue` — Route view that renders the live SSE observability stream: connection status, a KPI summary of the latest event, and a scrollable feed where each entry can display either a formatted metric grid or the raw JSON payload. It exists as the human-facing "playground" page for inspecting realtime metrics without any external tooling.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
