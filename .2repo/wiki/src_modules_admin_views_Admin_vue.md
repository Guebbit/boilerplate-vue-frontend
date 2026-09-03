# src/modules/admin/views/Admin.vue

## Purpose

Admin dashboard shell component. It owns the active-tab state (overview vs. audit), fetches initial data on mount, and passes shared observability state and fetchers from `useAdminObservability` down to the two tab components as props and emit handlers. It also handles the single destructive action on the page — purging expired refresh tokens — by wrapping the composable's call in a confirmation dialog and a success/error toast.

## Key elements

- **`activeTab`** – `ref<AdminTabKey>` bound to the Vuetify `v-tabs` control; switches between `'overview'` and `'audit'`.
- **`useAdminObservability()` destructure** – pulls shared reactive state (`health`, `metrics`, `auditEvents`, `auditTotal`, `auditPages`, loading/error flags), `fetchAll`, `fetchAuditLogs`, `clearingExpiredTokens`, and `clearExpiredTokens`. This composable is the single data source for both tabs.
- **`overviewLoading`** – computed that is `true` while either `loadingHealth` or `loadingMetrics` is in flight; passed to `AdminOverviewTab` as a single `:loading` prop.
- **`confirmClearExpiredTokens`** – opens a `useDialogStore().confirm()` prompt; on accept calls `clearExpiredTokens()` and toasts the result via `useNotificationsStore().addMessage()`. The view is responsible only for the confirmation UX and the user-facing messages; the actual request and its pending flag live in the composable.
- **`onMounted`** – fires `fetchAll()` once to prime both tabs.
- **Template** – renders `LayoutDefault`, a Vuetify tab bar, the "clear expired tokens" button (with `Trash2` icon and `:loading` bound to `clearingExpiredTokens`), and a `v-tabs-window` that mounts `AdminOverviewTab` or `AdminAuditTab`.

## Relationships

No graph neighbors were recorded for this file. It imports from `use-admin-observability`, `AdminOverviewTab`, `AdminAuditTab`, `LayoutDefault`, `@/ui/dialog`, `@guebbit/vue-toolkit`, and `lucide-vue-next`, but none of those were listed as tracked neighbors.

## Notes

- The JSDoc on `confirmClearExpiredTokens` explicitly calls out a contract difference inside the composable: `clearExpiredTokens` **rejects** on failure (so the view catches it), whereas the four read fetchers (`fetchAll`, `fetchAuditLogs`, etc.) do not — they surface errors through their `error*` refs instead. Don't assume a uniform error strategy when extending the composable.
- The view never imports a route guard or auth check; access control is presumably handled upstream (router-level or layout-level).
- All user-facing strings go through `t()` with the `admin-page.*` i18n namespace. Adding new copy means adding a key to that namespace, not hard-coding text.
- The `confirmClearExpiredTokens` helper is defined in `<script setup>` scope (not exported); the only template binding is `@click="confirmClearExpiredTokens"`.
