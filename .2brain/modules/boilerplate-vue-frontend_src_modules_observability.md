---
tags:
  - 2brain
  - 2brain/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/observability/
files: 25
updated: 2026-10-17T02:54:07.016330+00:00
---

# src/modules/observability/

## Purpose

The observability module is the admin-facing "ops console" for the platform: it surfaces service health and KPI metrics, provides a filterable/paginated audit log (platform-wide, shop-scoped, or per-record), and offers a live SSE playground for watching the realtime event stream. It is self-contained—routing, state, fetching, and UI all live under this directory—and registers itself with the app kernel via a module manifest so no domain store is imported from outside.

## Key parts

- **Module wiring** — `module.ts` declares routes, navigation entries, schema-validation hooks, and locale loaders for the kernel registry; `routes.ts` defines the three auth-gated, lazy-loaded routes (admin dashboard, audit log, realtime playground); `response-schemas.ts` pins the response-envelope shapes the module expects from its endpoints.
- **Views (route-level components)** — `Admin.vue` orchestrates the two-tab dashboard (overview + audit); `AuditLog.vue` resolves the `?target=` scope and delegates to the shared audit tab; `RealtimePlayground.vue` renders the live SSE feed with connect/disconnect controls.
- **Reusable components** — `AdminAuditTab.vue` is the self-fetching, filterable audit table used in all three audit contexts; `AdminOverviewTab.vue` is a pure-presentational KPI-card renderer driven entirely by props.
- **Composables (fetching & realtime logic)** — `use-admin-observability.ts` fetches health and metrics with independent per-panel error state; `use-audit-trail.ts` handles one page of audit data with pagination bookkeeping; `use-realtime-observability.ts` manages a module-level singleton SSE connection and routes typed events into the store.
- **State** — `store.ts` (Pinia) holds SSE connection status, the latest snapshot/update payloads, heartbeat, capped event feed, and last error; it is pure state + setter actions called by the composable.
- **Types** — `types.ts` defines view-layer assembly shapes (KPI cards, filter state, feed entries) that sit on top of the generated `@api` contract types.
- **Tests** — unit specs for each composable and the store, component-level specs for the two tabs, route-meta guards, a11y/visual-regression e2e configs, and an SSE-wiring spec that mocks the transport.

## How it connects

The module plugs into the application root (`/`) through the kernel's `AppModule` registry: `module.ts` is the single registration point the root loads to discover routes, navigation entries, schema hooks, and locale files. At the contract level it consumes the shared generated API client (`@api` / `@types`) and the `contracts/rest/routes.ts` table for endpoint typing, and relies on shared infrastructure utilities (`use-async-action`, `createSseClient`) that live outside this directory. Its e2e specs delegate actual scanning/snapshotting to shared sweep helpers at the repository root, keeping only declarative route/selector configuration co-located here.

## Where to start

1. **`module.ts`** – shows the full surface area the module exposes (routes, nav, schemas, locales) in one file, giving you the map before diving into any single concern.
2. **`views/Admin.vue`** – the main dashboard entry point; reading it reveals how the composable, the two tabs, and the audit tab wire together, which anchors the rest of the module's data flow.

## Connected modules
[[boilerplate-vue-frontend_ROOT|/ (repository root)]]

## Files
- `src/modules/observability/components/AdminAuditTab.vue` — A self-fetching audit-log tab that renders a filter form, a paginated data table, and a pager for a single audit trail. It accepts an `endpoint` (and optional `target`) prop so the same component serves three distinct contexts — the platform admin dashboard's audit tab, a single record's history, and the shop-wide audit page — without duplicating fetch/pagination wiring.
- `src/modules/observability/components/AdminOverviewTab.vue` — Presentational "Overview" tab of the admin observability dashboard. It receives already-fetched health and metrics payloads as props and derives every displayed KPI card (value, status colour, hint) from them. It owns no data-fetching state; all network I/O lives in the parent view.
- `src/modules/observability/composables/use-admin-observability.ts` — Vue composable that wraps the two read-only endpoints behind the Admin observability dashboard's overview tab (`GET /observability/health` and `GET /observability/metrics/overview`). It centralises per-panel loading/data/error state via `useAsyncAction` so each panel degrades independently and the partially-available stack still renders.
- `src/modules/observability/composables/use-audit-trail.ts` — Single composable that fetches one page of an audit trail from either the platform-wide or the shop-scoped endpoint, exposing rows, pagination totals, and load/error state. It exists so the dashboard audit tab, a record's own history, and the shop-wide audit page all share one pagination/error bookkeeping path instead of duplicating it three times.
- `src/modules/observability/module.ts` — Module manifest for the **observability** domain. It declares the shape the domain registers under `AppModule` in the kernel's registry — routes, navigation entries, response-schema validation hooks, and locale loaders — assembled from this module's own files. It exists so the kernel can discover and wire the observability console (service health, KPIs, audit log, SSE playground) without importing any domain store.
- `src/modules/observability/response-schemas.ts` — Declares the response-envelope schemas for every admin endpoint the **observability** module calls. It is the module-specific row set that the generated table in `contracts/rest/routes.ts` (derived from `openapi.yaml` `x-module` stamps) attributes to this domain.
- `src/modules/observability/routes.ts` — Defines the route table for the observability domain (admin console, audit log, realtime SSE playground). Each route is auth-gated, permission-checked via `meta.can`, and lazy-loaded so its view bundle only fetches when a visitor who actually holds the required permission navigates to it.
- `src/modules/observability/store.ts` — Pinia store (setup syntax) that holds the live SSE connection state for the observability dashboard: connection lifecycle status, the two most recent payload shapes (full snapshot vs. incremental update), a heartbeat timestamp, a capped event feed, and the last error. It is pure state plus setter actions — the SSE connection itself is managed in `use-realtime-observability.ts`, which calls these actions.
- `src/modules/observability/tests/admin-audit-tab.spec.ts` — Component-level test for `AdminAuditTab.vue` that covers the self-fetching behavior the `use-audit-trail.spec.ts` hook test does not: verifying that mounting the component fires the initial request, that the `target` prop is forwarded into the request payload, and that submitting the filter form re-fetches through the same endpoint.
- `src/modules/observability/tests/admin-overview-tab.spec.ts` — Scoped Vitest suite that verifies the **parked-jobs / queues card** on `AdminOverviewTab.vue`. The file's module docblock states explicitly that every other KPI and section on the tab is a pure function of props not exercised here, so this suite intentionally covers only the `queues` slice of the `ObservabilityHealth` payload.
- `src/modules/observability/tests/audit-log-view.spec.ts` — Verifies that `AuditLog.vue` reads the `target` query parameter from the URL and forwards it as a prop to `AdminAuditTab`. Proves that a plain `/audit` nav link and a record-specific "History" link (e.g. `?target=o1`) both resolve to the same page scoped correctly. `AdminAuditTab` itself is stubbed; its fetching logic is covered in `admin-audit-tab.spec.ts`.
- `src/modules/observability/tests/e2e/a11y.cy.ts` — Co-located accessibility (a11y) sweep configuration for the observability module's routes. It defines *which* routes and viewports to check; the actual scanning logic is delegated to the shared sweep helper. It lives inside the module so that deleting the module removes its a11y coverage with it, and a cross-cutting spec asserts every routed module has one of these files.
- `src/modules/observability/tests/e2e/admin.visual.cy.ts` — Defines the visual-regression screen list for the observability module's admin dashboard. It tells the shared sweep helper which route to visit, what selector signals the page is ready, and which live-changing elements to redact before snapshotting. The file itself contains no test logic — it is purely declarative configuration.
- `src/modules/observability/tests/e2e/realtime.cy.ts`
- `src/modules/observability/tests/e2e/realtime.visual.cy.ts` — Registers the **realtime** observability screen for visual-regression testing. It declares the screen's URL and readiness selector to the shared `sweepVisual` runner, which then visits the page, waits for the selector, takes a screenshot, and diffs it against the stored baseline.
- `src/modules/observability/tests/routes.spec.ts` — Verifies that every observability route record declares the expected `meta.access` and `meta.can` values, and that no route exists without an explicit access decision. It guards against a route silently becoming public by losing its `meta` declaration — a failure no other test in the suite would catch.
- `src/modules/observability/tests/store.spec.ts` — Unit tests for the `useRealtimeObservabilityStore` Pinia store, verifying that each action (`setStatus`, `setSnapshot`, `setUpdate`, `setHeartbeat`, `setError`) mutates state correctly and that the store initialises to a clean "idle" state. Each test runs against a freshly created Pinia instance to prevent state leakage between cases.
- `src/modules/observability/tests/use-admin-observability.spec.ts` — Unit tests for the `useAdminObservability` composable. Verifies that the two fetchers (`fetchHealth`, `fetchMetrics`) write independent state slices, that a failing endpoint degrades to an error message beside the panel that did answer, and that `fetchAll` fires both calls concurrently. Scope is limited to composition logic; audit-trail behavior is tested in `use-audit-trail.spec.ts` and async loading/error bookkeeping in `use-async-action.spec.ts`.
- `src/modules/observability/tests/use-audit-trail.spec.ts` — Vitest unit tests for the `useAuditTrail` composable (the fetcher behind `AdminAuditTab.vue`). They pin the contract-level behavior of both the **platform** and **shop** audit endpoints: which API function is called, how filters are passed (especially the `target` asymmetry), how the response envelope is split into reactive `entries`/`total`/`pages`, and how a failed call degrades to an `error` state instead of throwing.
- `src/modules/observability/tests/use-realtime-observability.spec.ts` — Unit tests for the `useRealtimeObservability` SSE composable. Rather than exercising a real `EventSource`, the tests mock `createSseClient` and assert the composable's wiring: which URL is opened, which event names are registered, how each event name is routed to a store action, and that the module-level singleton client is torn down before a second connection replaces it. The transport layer itself is covered separately in `tests/unit/infrastructure/create-sse-client.spec.ts`.
- `src/modules/observability/types.ts` — Defines the view-layer TypeScript types for the observability domain. It holds UI/composition-specific shapes (KPI cards, audit filter state, realtime feed entries, connection status) that no single API endpoint provides directly. Contract types (e.g. `ObservabilityHealth`, `AuditEntryItem`) intentionally live in `@types` (re-exports of the generated `@api` client); this file only adds the assembled view shapes on top.
- `src/modules/observability/use-realtime-observability.ts` — Composable that manages a **module-level singleton** SSE connection for the observability dashboard. `connect` opens the stream and routes each typed event into the paired Pinia store's actions; `disconnect` tears it down. The singleton lives outside the composable closure so re-mounting the consuming component never opens a second stream.
- `src/modules/observability/views/Admin.vue` — Admin dashboard shell that owns the active-tab state (overview vs. audit), invokes the shared `useAdminObservability` composable on mount, and distributes the resulting state down to `AdminOverviewTab`. It does not render any domain data itself — it is purely a layout/orchestration view.
- `src/modules/observability/views/AuditLog.vue` — Shop-level audit trail view. It exposes the tenant's own audit log to any role holding `read:AuditLog` (manager, support, moderator, admin) and can be narrowed to a single record's history via a `?target=<id>` query param. All data fetching and row rendering is delegated to `AdminAuditTab`; this component only resolves the scope, computes the hero title, and wires the pieces together.
- `src/modules/observability/views/RealtimePlayground.vue` — Route view that renders the live SSE observability stream: a connection-status chip with connect/disconnect controls, KPI tiles for the most recent event (uptime, heap, requests, SSE clients), and a scrollable feed of entries that can toggle between a formatted metric grid and raw JSON.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
