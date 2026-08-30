# src/modules/admin/components/AdminAuditTab.vue

## Purpose

Presentational audit-log tab for the admin dashboard. It owns the filter form's local state (actor, action, outcome, since, page, pageSize) and translates user interactions into a `search` emit; it renders the data table and pager declaratively from props the parent supplies. It never fetches data itself.

## Key elements

- **Props** – `auditEvents`, `total`, `pages`, `loading`, `error`: the parent feeds back the current page of results and loading/error state.
- **Emit `search(filters: AdminAuditFilters)`** – fired by Search, page-change, page-size-change, and Reset; the parent is responsible for fetching and for surfacing any rejection.
- **`filters` (reactive)** – single source of truth for the form; page number lives *inside* this object rather than in separate state, because a stale page number would point at a different result set.
- **`handleSearch`** – resets `filters.page` to 1 then emits `search`.
- **`handlePageChange(page)`** – sets `filters.page` and emits `search`.
- **`handleReset`** – clears all filter fields, restores default page size (50), resets page to 1, emits `search`.
- **`outcomeOptions` (computed)** – localized `all` / `success` / `failure` select options.
- **`pageSizeOptions`** – `[20, 50, 100]`; 100 is the API's declared maximum (larger values yield HTTP 422).
- **`tableHeaders` (computed)** – eight `CoreDataTableHeader<AuditEventItem>` entries mapping display columns to `AuditEventItem` field keys.
- **`truncateId(value, length=8)`** – shortens a correlation id for table display; returns `EMPTY_VALUE` dash when absent.
- **Template slots** – custom renderers for `timestamp` (formatted), `actor_role` (color-coded chip), `outcome` (color-coded chip), `ip` (dash fallback), `request_id` / `trace_id` (truncated + `title` + `sr-only` full id).

## Relationships

No graph neighbors are recorded for this file. It imports shared UI components (`DataTable`, `ListPagination`), type contracts (`AuditEventItem`, `AdminAuditFilters`, `CoreDataTableHeader`), and formatting utilities (`formatDateTime`, `EMPTY_VALUE`), all of which live in the `@/ui` and `@/infrastructure` layers.

## Notes

- **Page number is inside `filters`** — intentional: the audit trail is append-only and paged from the newest end, so a page number that outlives its filter set would be meaningless. Resetting filters always resets page to 1.
- **Accessibility on ID columns** – the truncated visible span is `aria-hidden="true"`; the full id is exposed via a separate `sr-only` span (not `aria-label`) to avoid `aria-prohibited-attr` on a role-less element and to prevent double-announcement. The `title` attribute is provided for mouse users.
- **`pageSizeOptions` cap at 100** reflects the API contract; do not add larger values without a backend change.
- **Error display is mutually exclusive with the table** – `<v-alert>` and `<DataTable>` are in an `v-if` / `v-else` pair, so the table is hidden when an error message is present.
