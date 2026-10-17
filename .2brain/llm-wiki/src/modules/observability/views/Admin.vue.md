---
source: src/modules/observability/views/Admin.vue
sha256: c380bc762e59b2a38beba0817b2fbdb647120564dca5e3fba599ae3511c050a8
generated_at: 2026-10-17T01:14:10.484344+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/views/Admin.vue

## Purpose

Admin dashboard shell that owns the active-tab state (overview vs. audit), invokes the shared `useAdminObservability` composable on mount, and distributes the resulting state down to `AdminOverviewTab`. It does not render any domain data itself — it is purely a layout/orchestration view.

## Key elements

- **`activeTab`** (`ref<AdminTabKey>`) — which tab is visible; defaults to `'overview'`. Drives both `<v-tabs>` and `<v-tabs-window>`.
- **`useAdminObservability()`** — composable call that yields `health`, `metrics`, `loadingHealth`, `loadingMetrics`, `errorHealth`, `errorMetrics`, and `fetchAll`.
- **`overviewLoading`** (computed) — `true` while either the health or metrics request is in flight; passed to `AdminOverviewTab` as `:loading`.
- **`onMounted` → `fetchAll()`** — fires the initial data fetch (fire-and-forget via `void`).
- **Template** — two `<v-tabs-window-item>` slots: one wraps `AdminOverviewTab` (props + `@refresh` emit), the other wraps `AdminAuditTab` (single `endpoint="platform"` prop).

## Relationships

| Neighbor | Interaction |
|---|---|
| `use-admin-observability.ts` | Called once in setup; provides all shared reactive state and the `fetchAll` fetcher used on mount and as the `@refresh` handler. |
| `AdminOverviewTab.vue` | Receives `health`, `metrics`, `loading`, `health-error`, `metrics-error` as props and emits `refresh` back to the parent to re-trigger `fetchAll`. |
| `AdminAuditTab.vue` | Receives only `endpoint="platform"`; manages its own fetching and state internally (does **not** consume the shared composable state). |
| `types.ts` | Supplies the `AdminTabKey` union type constraining `activeTab`. |

## Notes

- **Asymmetric tab wiring:** The overview tab is a pure presentational component fed entirely by props. The audit tab is self-sufficient and fetches its own data. Adding shared state to the audit tab would break this convention.
- **`void fetchAll()`** on mount is intentionally un-awaited; error handling is delegated to the reactive `errorHealth`/`errorMetrics` refs surfaced to the overview tab.
- **Data-test attributes** (`data-test="admin-tab-overview"`, `data-test="admin-tab-audit"`) exist for E2E selectors — preserve them when refactoring the tab markup.
