# src/modules/admin/types.ts

## Purpose

Defines the UI-layer type contracts for the Admin dashboard (tab keys, KPI card shape, and audit filter form state). It exists to keep view-specific types separate from the generated API contract types that live in `@types` / `@api`, as stated in the module doc comment.

## Key elements

- **`AdminTabKey`** — Union literal (`'overview' | 'audit'`) identifying the two tabs in the Admin dashboard.
- **`AdminKpiCard`** — Shape of a single KPI card: `title`, `value` (string or number), optional `hint`, and optional `status` (`ok | warn | error | loading | unknown`).
- **`AdminAuditFilters`** — State of the audit filter form: optional `actor`, `action`, `outcome` (`success | failure`), `since`, `page`, and `pageSize`. All fields are optional, making it a sparse form-state object.

## Relationships

- **`src/modules/admin/composables/use-admin-observability.ts`** — Consumes the types defined here (e.g. `AdminKpiCard`, `AdminAuditFilters`) when composing the observability view state for the dashboard.
- **`docs/tools/admin-dashboard.md`** — Documents the Admin dashboard; references these types as the view-layer contract alongside the `@api` contract types.

## Notes

- The module doc comment is explicit: **do not** place API contract types here. Those are re-exported from `@types` (which wraps the generated `@api` client). Only UI/composition-specific types belong in this file.
- `AdminAuditFilters` is entirely optional — treat it as a partial form snapshot, not a fully-populated query.
