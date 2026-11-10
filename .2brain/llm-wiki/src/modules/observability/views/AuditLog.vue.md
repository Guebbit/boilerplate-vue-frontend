---
source: src/modules/observability/views/AuditLog.vue
sha256: 6e9cb895cb0b73ca223ca780f56c11c338d78db819534d97c97374eb4b92838a
signature: 3cbad7274dde8fceb7143cb3b3ea470e5d1aef9cb7451c793f44ac3217e511e3
generated_at: 2026-11-10T04:57:14.781992+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/views/AuditLog.vue

## Purpose

Shop-scoped audit-log page, reachable by any tenant role holding `read:AuditLog` (`manager`/`support`/`moderator`/`admin`). It also serves as a single record's history view when opened via `?target=<id>` (set by "History" links on `UserTarget.vue`/`OrderTarget.vue`). All fetching and rendering is delegated to `AdminAuditTab`; this file only reads the initial `target` param and picks a heading.

## Key elements

- **`AuditLogPage`** (named-component block) – Provides a stable `name` for devtools and `<KeepAlive>`; required because `<script setup>` cannot declare one.
- **`target`** (computed) – Reads `route.query.target`; returns the string or `undefined` if absent/malformed (non-string value).
- **`heroTitle`** (computed) – Selects between `audit-log-page.page-title-target` (interpolating the target id) and `audit-log-page.page-title` based on whether `target` is present.
- **Template** – Renders a `PageHeader` with the dynamic title, then `<AdminAuditTab endpoint="shop" :target="target" />`.

## Relationships

- **`src/modules/observability/components/AdminAuditTab.vue`** – The page renders this component, passing `endpoint="shop"` and the initial `target`. `AdminAuditTab` performs all data fetching and log rendering; the page never interacts with the API directly.
- **`src/modules/observability/tests/audit-log-view.spec.ts`** – Unit/integration spec that exercises this view (heading selection, target passthrough, etc.).

## Notes

- The page **never rewrites the URL** as the user filters. Subsequent filtering happens entirely inside `AdminAuditTab`'s own form. This contrasts with `WebhookDeliveries.vue`, whose filters are bookmarkable via query params.
- The route (`observability/routes.ts`) sets `meta.customHero` so `LayoutDefault` suppresses its own hero; this page renders `PageHeader` itself because the title depends on the dynamic `?target=` value.
- The `target` value is read **once** from the initial route query to pre-fill the filter. The filter inside `AdminAuditTab` remains fully editable afterward.
- A non-string `route.query.target` (e.g. repeated param producing an array) is treated as absent — the page falls back to the generic "shop trail" title.
