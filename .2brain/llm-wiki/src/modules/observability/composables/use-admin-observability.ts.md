---
source: src/modules/observability/composables/use-admin-observability.ts
sha256: 14e3b05d02c76abbb62fe3aa38781ce0016b54e2203e7394220448e34610a38b
generated_at: 2026-10-17T01:11:11.185967+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/composables/use-admin-observability.ts

## Purpose

Vue composable that wraps the two read-only endpoints behind the Admin observability dashboard's overview tab (`GET /observability/health` and `GET /observability/metrics/overview`). It centralises per-panel loading/data/error state via `useAsyncAction` so each panel degrades independently and the partially-available stack still renders.

## Key elements

- **`UseAdminObservabilityReturn`** (interface) — the shape the composable returns: `health` / `metrics` refs (payload or `undefined`), per-call `loadingHealth` / `loadingMetrics` booleans, `errorHealth` / `errorMetrics` strings, and the three fetcher functions.
- **`useAdminObservability()`** (exported function) — builds two `useAsyncAction` instances (one per endpoint), exposes their `data`/`error`/`loading` refs, and returns `fetchHealth`, `fetchMetrics`, and `fetchAll` (the latter running both in parallel via `Promise.all`).

## Relationships

- **`src/modules/observability/views/Admin.vue`** — the sole consumer; calls `useAdminObservability()` to populate the overview tab's health and metrics panels and to trigger `fetchAll` on mount.
- **`src/modules/observability/tests/use-admin-observability.spec.ts`** — unit-tests the composable's state transitions, error handling, and `fetchAll` parallelism.

## Notes

- The audit trail is deliberately **not** part of this composable. `AdminAuditTab.vue` uses its own `useAuditTrail` composable so the same component can serve both the dashboard tab and a per-record history view.
- All fetchers resolve (never reject); failures are swallowed into the per-panel `error*` ref. Consumers must read the state refs rather than `await` a result.
- Fallback error messages are localised via `translate('admin-page.error-load-health' | 'admin-page.error-load-metrics')` from `@/i18n`.
- `fetchAll` resolves once **both** calls have settled (success or error), not once both succeed.
