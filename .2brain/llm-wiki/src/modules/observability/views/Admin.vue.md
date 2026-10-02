---
source: src/modules/observability/views/Admin.vue
sha256: 693133d0080dda31e02fd184c84327a93685b965af5b2c072f8f56c3ca36def8
generated_at: 2026-10-02T15:20:04.520522+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/views/Admin.vue

## Purpose

Admin dashboard shell for the observability module. Owns the active-tab state (overview vs. audit), fetches shared health/metrics data on mount, and dispatches the token-purge confirmation + toast. The two tab components render declaratively from props this view supplies.

## Key elements

- **`activeTab`** – `ref<AdminTabKey>` toggling between `'overview'` and `'audit'`; drives both `v-tabs` and `v-tabs-window`.
- **`useAdminObservability()` destructure** – pulls `health`, `metrics`, `loadingHealth`, `loadingMetrics`, `errorHealth`, `errorMetrics`, `fetchAll`, `clearingExpiredTokens`, `clearExpiredTokens`. Only the overview tab receives these as props; the audit tab is self-sufficient.
- **`overviewLoading`** – computed; `true` while either the health or metrics request is in flight.
- **`confirmClearExpiredTokens`** – opens a `useDialogStore().confirm()` dialog, then on acceptance calls `clearExpiredTokens()` and raises a success/error toast via `useNotificationsStore().addMessage()`. Returns early (no toast) if the user declines.
- **`onMounted` → `fetchAll()`** – triggers the initial data load for the overview tab.
- **Template** – Vuetify `v-tabs` / `v-tabs-window` layout, a "Clear expired tokens" button (bound to `clearingExpiredTokens` for the spinner), and the two tab child components.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The audit tab (`AdminAuditTab`) receives only an `endpoint="platform"` prop and manages its own data fetching internally; it does **not** consume the composable state destructured here.
- `clearExpiredTokens` is the only async action in the composable that *rejects* (vs. the four reads which resolve with error payloads). The `.catch()` in `confirmClearExpiredTokens` relies on that rejection.
- All user-facing strings go through `t()` (vue-i18n) with keys under the `admin-page.*` namespace.
- The token-purge button is the only mutation affordance on the page; everything else is read-only or refresh.
