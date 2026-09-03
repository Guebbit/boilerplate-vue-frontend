# src/modules/admin/types.ts

## Purpose

Defines the view-layer (UI/composition) type contracts for the Admin dashboard. It intentionally contains only types that describe *how the UI is structured* (tabs, KPI cards, filter forms) — not domain or API contract types, which are sourced from the generated `@api` client via `@types`.

## Key elements

- **`AdminTabKey`** — Union type (`'overview' | 'audit'`) identifying the top-level tabs in the Admin dashboard.
- **`AdminKpiCard`** — Interface describing a single KPI card: `title`, a pre-formatted `value` (`string | number`), optional `hint`, and optional `status` (`'ok' | 'warn' | 'error' | 'loading' | 'unknown'`) that drives the card's visual badge.
- **`AdminAuditFilters`** — Interface for the audit log filter form: optional `actor`, `action`, `outcome`, `since` (ISO timestamp), plus pagination via `page` (1-based) and `pageSize`. All fields are optional, representing a partial/incomplete filter state.

## Relationships

No graph neighbors recorded. The file is a pure type declaration module with no runtime imports or exports beyond the three types above.

## Notes

- **Boundary convention:** The module doc explicitly states that contract types (e.g. `ObservabilityHealth`, `AuditEventItem`) belong in `@types` / `@api`, *not* here. Adding a domain type to this file violates the intended separation.
- **`value` is display-ready:** `AdminKpiCard.value` is typed `string | number` because formatting is expected to happen *before* the card is rendered. Consumers should not expect to format it.
- **All `AdminAuditFilters` fields are optional:** The type models a *partial* form state; there is no "empty filter" sentinel — absence of a field means "no filter applied."
