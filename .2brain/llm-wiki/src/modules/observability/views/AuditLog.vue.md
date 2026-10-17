---
source: src/modules/observability/views/AuditLog.vue
sha256: 5e682e49537c9853f498965e77e3ed4c6548255d22fb1961e537698811d81ff4
generated_at: 2026-10-17T01:14:18.754061+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/views/AuditLog.vue

## Purpose

Shop-level audit trail view. It exposes the tenant's own audit log to any role holding `read:AuditLog` (manager, support, moderator, admin) and can be narrowed to a single record's history via a `?target=<id>` query param. All data fetching and row rendering is delegated to `AdminAuditTab`; this component only resolves the scope, computes the hero title, and wires the pieces together.

## Key elements

- **`export default { name: 'AuditLogPage' }`** — Named-component block (plain `<script>`) so the SFC has a stable name for devtools / `<KeepAlive>`, since `<script setup>` cannot declare one.
- **`target` (computed)** — Reads `route.query.target` once; returns the string value or `undefined`. Intentionally not reactive to URL changes mid-session (the filter form inside `AdminAuditTab` handles dynamic filtering instead).
- **`heroTitle` (computed)** — i18n string: scoped record title (`audit-log-page.page-title-target`) when `target` is set, generic title (`audit-log-page.page-title`) otherwise.
- **Template** — Renders `PageHeader` with the computed title, then `AdminAuditTab` with `endpoint="shop"` and `:target="target"`.

## Relationships

- **`AdminAuditTab.vue`** — The sole content component. This view passes `endpoint="shop"` (distinguishing it from the installation-wide `endpoint="platform"` usage in `Admin.vue`) and the optional `target` prop. `AdminAuditTab` owns all API calls and row rendering.
- **`audit-log-view.spec.ts`** — Unit test for this view; exercises the `target`-scoped and unscoped rendering paths and the hero-title swap.

## Notes

- The route (`observability/routes.ts`) sets `meta.customHero`, which tells `LayoutDefault` to suppress its own hero. This page renders its own `PageHeader` instead because the title depends on the runtime `?target` value, which a static `meta` key cannot express.
- `?target=<id>` is set by "History" links on `User.vue` / `Order.vue`. If the param is non-string or repeated, `target` resolves to `undefined` and the page falls back to the full log.
- This page does **not** support bookmarkable filter-state in the URL (unlike `WebhookDeliveries.vue`); the filter form lives entirely inside `AdminAuditTab` and is ephemeral per session.
