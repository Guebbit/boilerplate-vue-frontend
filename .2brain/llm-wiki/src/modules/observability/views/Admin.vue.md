---
source: src/modules/observability/views/Admin.vue
sha256: ba62b32dba826623604bb59bae9cd576dfdff66a21f7f1db7fdc28a7437b37c4
signature: 60aead04b7dce925f137e9211d81473406e98dacabf54f14abd6369a2c165559
generated_at: 2026-11-10T04:57:05.134284+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/views/Admin.vue

## Purpose
Admin dashboard shell that owns the active-tab state (overview / audit) and routes shared observability data from the `useAdminObservability` composable down to the child tab components. It exists as the single entry-point view for the admin section of the observability module.

## Key elements
- **`name: 'AdminPage'`** (named script block) — gives the SFC a stable component name for DevTools and `<KeepAlive>`; required because `<script setup>` cannot declare one.
- **`activeTab`** (`ref<AdminTabKey>`) — tracks which tab is currently visible; defaults to `'overview'`.
- **`useAdminObservability()` destructure** — pulls `health`, `metrics`, `loadingHealth`, `loadingMetrics`, `errorHealth`, `errorMetrics`, and `fetchAll` from the shared composable.
- **`overviewLoading`** (computed) — `true` while either the health or metrics fetch is in flight; passed as the `loading` prop to the overview tab.
- **`onMounted` → `fetchAll()`** — kicks off the initial data load; errors are swallowed into the composable's error refs rather than rejecting.
- **Template** — Vuetify `v-tabs` / `v-tabs-window` pair driven by `activeTab`; renders `AdminOverviewTab` and `AdminAuditTab` in separate window items.

## Relationships
- **`AdminOverviewTab.vue`** — receives `health`, `metrics`, `loading`, `health-error`, `metrics-error` as props; emits `refresh` which the view binds to `fetchAll`. All its data flows from this view.
- **`AdminAuditTab.vue`** — rendered with a static `endpoint="platform"` prop only. Per its own docs it reads and fetches independently; this view does **not** pass the composable's state to it.
- **`use-admin-observability.ts`** — sole provider of the shared state and `fetchAll` fetcher consumed here.
- **`types.ts`** — source of the `AdminTabKey` union type used to type the `activeTab` ref.

## Notes
- The audit tab is deliberately self-sufficient: it does not inherit the composable's health/metrics state. If you expect shared loading indicators on that tab, they won't be driven by this view.
- The `void fetchAll()` in `onMounted` has an explicit eslint-disable for `no-floating-promises`; rejections are intentionally not awaited because the composable captures them into `errorHealth` / `errorMetrics`.
- Tab keys are constrained by `AdminTabKey` from `types.ts`; adding a new tab requires updating that union as well as the template.
