---
source: src/modules/observability/composables/use-audit-trail.ts
sha256: e29d167dd189479eee8fec6e1439f11e6edfb11d81c774c57115c286c62d37a2
signature: ad3cc2083b1d2d8df515021634174e440a427aecadd07b78ad0e3e8904843416
generated_at: 2026-11-10T04:52:04.209776+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/composables/use-audit-trail.ts

## Purpose

A self-contained composable that fetches one page of an audit trail from either the platform-wide or shop-scoped endpoint, providing uniform pagination state and error handling. It exists so that the dashboard audit tab, a single record's history view, and the shop-wide audit page all share one implementation of pagination/error bookkeeping instead of duplicating it.

## Key elements

- **`AuditEndpoint`** (type) — `'platform' | 'shop'`, selects which backend contract to call for the composable's lifetime.
- **`UseAuditTrailReturn`** (interface) — the return shape: `entries`, `total`, `pages`, `loading`, `error`, and `fetchPage`.
- **`useAuditTrail(endpoint)`** (exported function) — the composable body. Wires `useAsyncAction` to either `listObservabilityAuditEntries` (platform) or `listAuditEntries` (shop), normalises the filter parameters, and exposes computed refs for rows/pagination plus a `fetchPage` that never rejects (errors land in the `error` ref).

## Relationships

- **`src/modules/observability/types.ts`** — provides the `AdminAuditFilters` type consumed as the argument to `fetchPage` and the internal async action.
- **`src/infrastructure/utils/errors.ts`** — provides `getErrorMessage`, used as the `resolveError` handler so any thrown error is reduced to a display string before landing in the `error` ref.
- **`src/modules/observability/components/AdminAuditTab.vue`** — primary consumer; calls `useAuditTrail('platform')` (or `'shop'`) and binds the returned refs to the tab's table and pager.
- **`src/modules/observability/tests/use-audit-trail.spec.ts`** — unit tests exercising both endpoints, filter normalisation, and error-resolution behaviour.

## Notes

- `fetchPage` always resolves (never rejects); consumers must read the `error` ref to detect failures.
- The `since` filter is coerced via `new Date(since).toISOString()` at call time, so passing an already-ISO string round-trips unchanged.
- Shop-endpoint-only fields (`target`, `ownOrder`) are sent as `undefined` when falsy/unchecked rather than `false`, because a `false` value in the request would filter out rows that should be visible.
- The composable is intentionally stateless across calls: each `fetchPage` invocation replaces the previous page's data. There is no internal caching or history.
