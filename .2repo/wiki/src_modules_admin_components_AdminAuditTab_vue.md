# src/modules/admin/components/AdminAuditTab.vue

## Purpose

Audit-log tab of the admin dashboard. It renders a filter form, a data table, and a pager for audit events, but performs no data fetching itself — all retrieval is delegated to the parent view via a `search` emit. The component is purely presentational: it owns only the local filter-form state and passes structured filters upward.

## Key elements

- **`props`** — `auditEvents`, `total`, `pages`, `loading`, `error`: the table data and parent-owned load/error status fed back in for rendering.
- **`emit('search', filters)`** — the sole outward event; carries the current `AdminAuditFilters` object (actor, action, outcome, since, page, pageSize) to the parent for fetching.
- **`filters`** (reactive) — local state for the filter form fields; page and pageSize live here so that changing filters resets the page and page changes re-emit the full filter bag.
- **`handleSearch`** — resets `filters.page` to 1 and emits the current filters.
- **`handlePageChange(page)`** — sets `filters.page` and emits; page is kept inside the filter object so a stale page number can never point at a different result set.
- **`handleReset`** — clears all filter fields, restores `DEFAULT_PAGE_SIZE` (50), and re-emits.
- **`truncateId(value, length?)`** — returns the first *length* characters (default 8) + `…`, or `EMPTY_VALUE` when absent; used for request/trace ID cells.
- **`tableHeaders`** (computed) — localized `CoreDataTableHeader<AuditEventItem>[]` mapping column keys to i18n labels.
- **`outcomeOptions`** (computed) — localized select options for the outcome filter (all / success / failure).
- **`pageSizeOptions`** — `[20, 50, 100]`; capped at 100 because the API contract returns 422 above that.
- **Template slots** — custom rendering for `timestamp` (formatted), `actor_role` and `outcome` (colored Vuetify chips), `ip` (fallback to `EMPTY_VALUE`), and `request_id`/`trace_id` (truncated with full id in `title` + a visually-hidden `sr-only` span for screen readers).

## Relationships

No graph neighbors are recorded for this file. It imports shared UI components (`DataTable`, `ListPagination`), the `Search` icon from `lucide-vue-next`, the `AuditEventItem` / `AdminAuditFilters` types, and `formatDateTime` / `EMPTY_VALUE` utilities, but those are consumed rather than constituting a bidirectional graph edge in the dependency data provided.

## Notes

- **Never fetches.** The component has no composable, no `fetch`, no API call. Any change that would require a request must go through the `search` emit; the parent is solely responsible for network I/O and for surfacing errors via the `error` prop.
- **Page reset on filter change is intentional.** `handleSearch` forces `page = 1` because the audit trail is append-only and paged from the newest end; a page number from a previous filter set would reference different rows.
- **`pageSizeOptions` is a plain array, not a computed.** Its values are fixed by the API contract (`maximum: 100`); do not derive them dynamically.
- **Accessibility choice for IDs.** The full request/trace id is exposed via a `title` attribute (mouse-only) *and* a `sr-only` `<span>`. A `aria-label` on a role-less `<span>` is prohibited (`aria-prohibited-attr`), and `aria-hidden` on the visible span prevents double announcement.
- **`novalidate` on the form.** Validation is expected upstream or via Vuetify; the browser's native validation UI is suppressed.
