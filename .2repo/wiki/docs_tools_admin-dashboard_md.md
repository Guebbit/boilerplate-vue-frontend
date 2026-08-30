# docs/tools/admin-dashboard.md

## Purpose

Documents the admin dashboard's **mechanism**: which panels it renders, how data flows from `/observability/*` into view, and the metric/filter definitions. It deliberately scopes out the *domain* narrative (what the admin module is, why it is built to be deleted), which lives on the module page.

## Key elements

- **Route** `/:locale/admin` — access-gated by `meta.access` (redirects non-admins Home); no in-component role check.
- **Overview tab** — eight KPI cards (API Status, Database, Uptime, Requests, Errors, Error Rate, Latency p50, Latency p95), fetched live via `useAdminObservability()`.
- **Audit Log tab** — colour-coded, filterable table (actor, action, outcome, since). Trace/request IDs are truncated with hover-to-reveal.
- **Data flow** — API `/observability/*` → `useAdminObservability()` → reactive state → KPI cards / audit table.
- **File table** — maps `Admin.vue` (shell), `use-admin-observability.ts` (fetch + state), `types.ts` (view-model interfaces) to their roles.

## Relationships

- **`src/modules/admin/views/Admin.vue`** — the component this doc describes; tab shell that renders the two panels.
- **`src/modules/admin/composables/use-admin-observability.ts`** — the sole data source for both tabs; exposes the reactive state the views consume.
- **`src/modules/admin/types.ts`** — provides `IAdminKpi` and `IAdminAuditFilters`, the view-model contracts the composable and view share.
- **`docs/tools/i18n.md`** — the route parameter `:locale` makes the dashboard a locale-scoped screen; i18n governs how that parameter is resolved.

## Notes

- Access control is enforced **at the router** (`meta.access`), not inside the component. Do not add a redundant role check in `Admin.vue`.
- The dashboard talks to `/observability/*` (operational API), **not** to a domain resource. This is the reason it is its own module rather than a page under a domain.
- The **trace id** in the audit table is the same identifier the API reports to Tempo — it is a live entry point into distributed tracing, not a dead-end log line.
- `useAdminObservability` has **no unit tests** and carries most of the repo's no-coverage mutants (see mutation-testing doc). Treat it as intentionally untested until coverage strategy changes.
