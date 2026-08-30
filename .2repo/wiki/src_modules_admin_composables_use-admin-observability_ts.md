# src/modules/admin/composables/use-admin-observability.ts

## Purpose

Vue composable that centralises the admin observability dashboard's data layer: three read endpoints (health, metrics overview, paginated audit logs) and one write (expired-token purge). It exists so the view binds to shared reactive refs rather than duplicating fetch/error bookkeeping per panel.

## Key elements

- **`UseAdminObservabilityReturn`** — exported interface describing every ref, computed, and function the composable exposes. Serves as the contract between this module and its consumer.
- **`useAdminObservability()`** — the sole exported function. Returns the full state object described above.
- **Three `useAsyncAction` instances** (health, metrics, audit) — each wraps one `@api` GET call. On failure the promise *resolves* and the message lands in the panel's own `error*` ref; the UI can still render the other two panels.
- **`auditEvents` / `auditTotal` / `auditPages`** — computed refs derived from the single audit envelope (`{ items, meta }`), avoiding duplicated state that could disagree.
- **`fetchHealth` / `fetchMetrics` / `fetchAuditLogs` / `fetchAll`** — thin wrappers over the `run` functions; all resolve with `void`.
- **`clearExpiredTokens` / `clearingExpiredTokens`** — the one *write* action. Deliberately **not** wrapped in `useAsyncAction`: it rejects on failure so the calling view can react (toast) synchronously. The pending flag is the only local state it owns.

## Relationships

- **`src/modules/admin/views/Admin.vue`** — primary consumer; calls `useAdminObservability()` in setup, binds the loading/error refs to panel UI, and calls `fetchAll()` on mount. Consumes `clearingExpiredTokens` to disable the purge button.
- **`src/modules/admin/types.ts`** — source of the `AdminAuditFilters` interface that parameterises `fetchAuditLogs`.
- **`docs/tools/admin-dashboard.md`** — product documentation describing the dashboard this composable backs; useful for understanding *why* each panel exists.

## Notes

- **Read vs. write error strategy is intentional.** Reads swallow rejections into per-panel error refs (partial render). The write (`clearExpiredTokens`) propagates the rejection so the view's existing toast logic fires without polling an error ref after the fact. Do not "unify" it into `useAsyncAction`.
- The audit payload is a single envelope; `auditEvents`, `auditTotal`, and `auditPages` are all *computeds* off that one ref. Storing them as separate refs would risk inconsistency.
- All error messages go through `translate()` (`@/infrastructure/i18n`) with keys prefixed `admin-page.error-load-*`.
- `fetchAuditLogs` defaults to `{}` (first page, no filters) if called without arguments.
