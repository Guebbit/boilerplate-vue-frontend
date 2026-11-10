---
source: src/modules/observability/components/AdminAuditTab.vue
sha256: 229f8505cf5e1ffc30a6eea3a7773e034caf61d9b40aa2b9be5503fc13e76b26
signature: 23683007d1b2c7cc635f788df722a895fe793c9ee5aa8e76bd00c3b5685b301d
generated_at: 2026-11-10T04:51:21.249369+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/components/AdminAuditTab.vue

## Purpose

Self-fetching audit-log tab that renders a filter form, a paginated table, and a pager over one audit trail. A single `endpoint` prop (`'platform' | 'shop'`) selects which contract-backed read `useAuditTrail` drives, letting one component serve the platform dashboard's audit tab, a record's own history, and the shop-wide audit page without duplicating fetch/pagination wiring.

## Key elements

- **Props** — `endpoint: AuditEndpoint` (which trail to read) and `target?: string` (starting value for the target filter, editable by the visitor; shop trail only).
- **`isShop`** — computed flag; when true, the `target` and `ownOrder` filter fields are rendered.
- **`useAuditTrail(props.endpoint)`** — provides `entries`, `total`, `pages`, `loading`, `error`, `fetchPage`.
- **`filters` / `page` / `pageSize`** — local reactive state; `page` and `pageSize` are kept separate from `filters` so the URL helper can restore criteria independently.
- **`syncUrl`** (from `useListUrlState`, prefix `audit`) — serialises filters, page, and page size into the query string for shareable links.
- **`load()`** — spreads filters + page + pageSize into `fetchPage`.
- **`handleSearch` / `handlePageChange` / `handleReset`** — mutation → reset-to-page-1 (on filter change) → fetch.
- **`outcomeOptions` / `outcomeChoice`** — `useAnyFilterChoice` wrapper; "all" is represented by `value: null` (not `undefined`) to avoid Vuetify treating it as a label.
- **`pageSizeOptions`** — `[20, 50, 100]`, bounded by the API contract's `maximum: 100`.
- **`tableHeaders`** — nine columns: timestamp, actorUserId, actorRole, action, targetId, outcome, ip, requestId, traceId.
- **`targetLink(item)`** — resolves a row's `targetType`/`targetId` via `auditTargetLocation` + `routerLinkI18n`; returns `undefined` when no route exists.
- **`truncateId(value, length = 8)`** — shortens request/trace IDs for table cells.
- **Initial load** — `void load()` fires unguarded on mount (eslint-disable for floating promise).

## Relationships

- **`src/modules/observability/composables/use-audit-trail.ts`** — sole data-fetching dependency; `useAuditTrail` owns the HTTP call and pagination arithmetic.
- **`src/modules/observability/audit-target.ts`** — provides `auditTargetLocation` (row → route resolution) and `shortTargetId` (display helper for the target column).
- **`src/modules/observability/components/AuditMetadataDetail.vue`** — rendered inside the action cell slot to expand per-entry metadata (e.g. changed fields on an update).
- **`src/modules/observability/types.ts`** — supplies the `AdminAuditFilters` type that shapes the `filters` ref.
- **`src/modules/observability/views/Admin.vue`** — mounts this component with `endpoint="platform"` for the platform dashboard's audit tab.
- **`src/modules/observability/views/AuditLog.vue`** — mounts this component with `endpoint="shop"` and an optional `target` for the shop-wide audit page.
- **`src/modules/inventory/views/PreordersBoard.vue`** — consumes this component to show a record's own audit history.
- **`src/modules/observability/tests/admin-audit-tab.spec.ts`** — unit tests for this component's filter, pagination, and table rendering.
- **`src/modules/observability/tests/audit-log-view.spec.ts`** — integration tests that exercise the component through the AuditLog view.

## Notes

- The `target` prop is **not** a fixed scope; it seeds the filter field, which the user can edit or clear.
- Page number is intentionally **not** preserved across filter changes — the trail is append-only and paged from the newest end, so a stale page number would point at a different slice of rows.
- The "all" outcome option uses `null` rather than `undefined` specifically to avoid Vuetify's `undefined`-as-label quirk.
- The `ownOrder` chip in the action column indicates the actor was also the buyer — allowed and recorded, not an error.
- `pageSize` is capped at 100 because the API returns 422 for larger values; do not add options beyond that.
