# src/modules/admin/composables/use-admin-observability.ts

## Purpose

Vue composable that centralises the admin observability dashboard's data layer: three read endpoints (health, metrics overview, paginated audit logs) and one write (expired-token purge). It gives the dashboard a single composable to call instead of repeating per-panel `loading`/`error`/`data` bookkeeping, and deliberately treats reads and the write differently in terms of error propagation.

## Key elements

- **`UseAdminObservabilityReturn`** — interface describing every ref, computed, and action the composable exposes.
- **`useAdminObservability()`** — the single exported function. Internally creates three `useAsyncAction` wrappers (one per read endpoint) and returns the aggregated state + fetchers.
- **`health` / `metrics` / `audit`** — `Ref` payloads fed by their respective `useAsyncAction`. Audit is an envelope (`{ items, meta }`); the other two are flat.
- **`auditEvents` / `auditTotal` / `auditPages`** — `ComputedRef`s derived from the audit envelope so consumers never index into the raw payload.
- **`fetchHealth` / `fetchMetrics` / `fetchAuditLogs`** — resolve-never fetchers; failures land in the corresponding `error*` ref.
- **`fetchAll`** — runs all three reads via `Promise.all` for the initial dashboard paint.
- **`clearingExpiredTokens`** — plain `Ref<boolean>` pending flag, bound by the view to its button.
- **`clearExpiredTokens`** — the only *rejecting* action; calls `deleteExpiredTokens` and lets the promise reject so the view can show a toast. Intentionally **not** wrapped in `useAsyncAction`.

## Relationships

No graph neighbors are tracked for this file. It imports from `@guebbit/vue-toolkit` (`useAsyncAction`), `@api` (four endpoint functions), `@types` (response types), `@/modules/admin/types.ts` (`AdminAuditFilters`), and `@/infrastructure/i18n` (`translate`).

## Notes

- **Read vs write asymmetry is intentional.** Reads swallow errors into a ref so a partially-available stack still renders the panels that succeeded. The token-purge write *rejects* because the visitor is owed a visible outcome; the view handles the rejection with a toast. Don't "fix" this by wrapping the write in `useAsyncAction`.
- **Audit is paginated server-side.** `auditEvents` holds only the current page's items; `auditTotal` and `auditPages` come from `meta`. The pager in the view reads these computed refs, not the raw envelope.
- **Error strings are i18n'd at call time** via `translate('admin-page.error-load-*')`, passed as `fallbackErrorMessage` to `useAsyncAction`.
- **`fetchAll` is fire-and-forget for the dashboard's initial load;** it resolves only after all three reads have *settled* (whether or not they succeeded).
- **All returned values are reactive refs/computed refs**, not raw values — consumers must read `.value` in templates or reactive contexts.
