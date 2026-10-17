---
source: src/modules/observability/composables/use-audit-trail.ts
sha256: 5c7108f6ebe76f17f3f890e28c17a21a6c4e9b4ad03de3021585ea647097bad8
generated_at: 2026-10-17T01:11:20.626614+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/composables/use-audit-trail.ts

## Purpose

Single composable that fetches one page of an audit trail from either the platform-wide or the shop-scoped endpoint, exposing rows, pagination totals, and load/error state. It exists so the dashboard audit tab, a record's own history, and the shop-wide audit page all share one pagination/error bookkeeping path instead of duplicating it three times.

## Key elements

- **`AuditEndpoint`** (`'platform' | 'shop'`) — selects which API call to make (`listObservabilityAuditEntries` vs. `listAuditEntries`). Fixed for the composable's lifetime.
- **`UseAuditTrailReturn`** — interface describing the composable's return: `entries`, `total`, `pages`, `loading`, `error`, `fetchPage`.
- **`useAuditTrail(endpoint, target?)`** — the sole export. Wires `useAsyncAction` to the appropriate `@api` call, converts `datetime-local` filter values to ISO instants, and derives `computed` refs for the page rows and pager metadata.

## Relationships

- **`AdminAuditTab.vue`** — primary consumer; the composable is explicitly described as "behind" this component.
- **`types.ts`** (same directory) — supplies the `AdminAuditFilters` type used as the `fetchPage` parameter and inside the API call mapping.
- **`use-audit-trail.spec.ts`** — unit-test file covering this composable's behavior.

## Notes

- `fetchPage` **never rejects**; failures land in the `error` ref (same convention as `useAdminObservability`). Consumers read state refs rather than catching.
- `target` (e.g. a user or order id) is merged silently into every `shop`-endpoint request and is **ignored** on the `platform` endpoint, whose contract has no such filter.
- The `since` filter is passed through `new Date(value).toISOString()` to bridge `datetime-local` inputs (no timezone) to the ISO-instant the API expects; already-ISO values round-trip unchanged.
- Pattern is explicitly lifted from `useAdminObservability`; treat those two composables as a matched pair when refactoring error-handling or pagination conventions.
