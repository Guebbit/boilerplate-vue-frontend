# src/modules/admin/views/Admin.vue

## Purpose

The admin dashboard shell. It owns which tab (overview or audit) is active, pulls all shared observability state and fetchers from `useAdminObservability`, and passes them down to the two tab child components as props. It also handles the "clear expired tokens" user action (confirmation dialog + outcome toast) and triggers the initial data fetch on mount.

## Key elements

- **`activeTab`** (`ref<AdminTabKey>`) — drives the Vuetify `v-tabs` / `v-tabs-window` pair; defaults to `'overview'`.
- **`overviewLoading`** (computed) — `true` while *either* `loadingHealth` or `loadingMetrics` is in flight; passed as a single `:loading` prop to `AdminOverviewTab`.
- **`confirmClearExpiredTokens()`** — opens a warning-level confirmation via `useDialogStore()`. On accept, calls `clearExpiredTokens()` from the composable and raises a success or error toast via `useNotificationsStore()`. Declining resolves silently.
- **`onMounted → fetchAll()`** — kick-starts the health, metrics, and audit reads so the overview tab is populated immediately.
- **Template** — wraps everything in `LayoutDefault`; renders `AdminOverviewTab` and `AdminAuditTab` inside a `v-tabs-window`, plus a persistent "Clear expired tokens" button (`Trash2` icon) in the toolbar row.

## Relationships

- **`src/modules/admin/composables/use-admin-observability.ts`** — sole source of all shared reactive state (`health`, `metrics`, `auditEvents`, loading/error flags) and the three fetchers (`fetchAll`, `fetchAuditLogs`, `clearExpiredTokens`). This view destructures from it and forwards values as props or `@emit` handlers to the two tab children.
- **`docs/theory/strategic-ddd.md`** — architectural reference describing the module-bounded structure this view sits within (the `admin` bounded context).
- **`docs/tools/admin-dashboard.md`** — user-facing documentation for the dashboard this view implements.

## Notes

- The confirmation dialog and the toast wording are intentionally kept **in this view**, while the actual `clearExpiredTokens` call and its `clearingExpiredTokens` pending flag live in the composable. The code comment explicitly notes that `clearExpiredTokens` **rejects** on failure, unlike the four read fetchers which resolve with an error payload — the `.catch()` here is therefore required.
- All user-facing strings go through `t()` (vue-i18n); no literal copy appears in the template.
- The "refresh" and "search" events from the tab children are wired back to `fetchAll` / `fetchAuditLogs` respectively, keeping the fetch logic in one place.
