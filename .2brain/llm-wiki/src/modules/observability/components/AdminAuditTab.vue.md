---
source: src/modules/observability/components/AdminAuditTab.vue
sha256: 395d65d6c7add7137825f232eec9471a1d0ec5822a64763f9e47b0b4212c2489
generated_at: 2026-10-17T01:10:51.410551+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/components/AdminAuditTab.vue

## Purpose

A self-fetching audit-log tab that renders a filter form, a paginated data table, and a pager for a single audit trail. It accepts an `endpoint` (and optional `target`) prop so the same component serves three distinct contexts — the platform admin dashboard's audit tab, a single record's history, and the shop-wide audit page — without duplicating fetch/pagination wiring.

## Key elements

- **`props.endpoint: AuditEndpoint` / `props.target?: string`** — Selects which contract-backed read `useAuditTrail` drives; `target` pins a fixed scope (e.g. one record's id).
- **`useAuditTrail(props.endpoint, props.target)`** — Returns `entries`, `total`, `pages`, `loading`, `error`, `fetchPage`; the sole data source for the component.
- **`filters: AdminAuditFilters`** — Reactive bag holding `actor`, `action`, `outcome`, `since`, `page`, `pageSize`. Sent verbatim to `fetchPage` on every search/page/reset.
- **`outcomeChoice`** — Wraps `filters.outcome` via `useAnyFilterChoice` so the Vuetify select can use `null` (not `undefined`) for the "All" option.
- **`handleSearch` / `handlePageChange` / `handleReset`** — Each resets or updates `filters.page`, then calls `fetchPage({ ...filters })` and returns the promise.
- **`truncateId(value, length?)`** — Shortens a request/trace id to `length` chars + ellipsis for table display; falls back to `EMPTY_VALUE` when absent.
- **Template** — Vuetify filter card, `DataTable` with scoped slots (formatted timestamp, role/outcome chips, mono-font truncated IDs with `sr-only` full text), `ListPagination`, and a "showing N of M" status line.
- **Initial load** — `void fetchPage({ ...filters })` at setup time fires the first unfiltered page request.

## Relationships

- **`../composables/use-audit-trail.ts`** — Imported for the `useAuditTrail` composable and the `AuditEndpoint` type; all network/pagination logic lives there.
- **`../types.ts`** — Provides the `AdminAuditFilters` interface that shapes the reactive filter state.
- **`views/Admin.vue`** — Parent view that mounts this component as a tab, passing an `endpoint` value.
- **`views/AuditLog.vue`** — Shop-wide audit page that reuses this component with a different `endpoint` (and possibly a `target`).
- **`tests/admin-audit-tab.spec.ts`** — Unit tests exercising this component's rendering, filters, and pagination.
- **`tests/audit-log-view.spec.ts`** — Integration-level tests that mount `AuditLog.vue`, which in turn renders this component.

## Notes

- **`outcome` "All" is `null`, not `undefined`.** Vuetify interprets an `undefined` item value as "use the label string," which would send a translated label to the API. The `useAnyFilterChoice` wrapper bridges the `null`↔`undefined` mismatch between the select model and the filter object.
- **Page size is capped at 100.** The API contract declares `maximum: 100`; `pageSizeOptions` is hard-coded to `[20, 50, 100]` so no option can trigger a 422.
- **Page number lives inside `filters`, not in separate state.** Because the trail is append-only and paged from newest, a stale page number would point at a different row set after filters change; every `handleSearch`/`handleReset` resets it to 1.
- **ID cells use a two-span pattern** (`aria-hidden` visible text + `sr-only` full id) rather than `title`-only or `aria-label`, to satisfy `aria-prohibited-attr` on a role-less `<span>` while still exposing the full id to screen readers.
