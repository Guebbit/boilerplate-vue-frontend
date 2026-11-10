---
source: src/modules/observability/routes.ts
sha256: f12b47f46b82c42ae70bf6ea09fe0ba7308ec1ea005ac0e8245e7f5d05c40c69
signature: f12b47f46b82c42ae70bf6ea09fe0ba7308ec1ea005ac0e8245e7f5d05c40c69
generated_at: 2026-11-10T04:52:26.600905+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/routes.ts

## Purpose
Declares the Vue Router route table for the observability domain. It defines three authenticated, permission-gated, lazy-loaded routes (admin console, tenant-scoped audit log, and a realtime SSE playground) that are mounted into the app's module registry.

## Key elements

- **`default` export** — an array satisfying `RouteRecordRaw[]` containing three route records:
  - **`Admin`** (`/admin`) — requires `can: read ObservationSnapshot`; loads `./views/Admin.vue`.
  - **`AuditLog`** (`/audit`) — requires `can: read AuditLog`; loads `./views/AuditLog.vue`. Carries `meta.customHero: true`, signalling that the view renders its own `PageHeader` (potentially with a `?target=` query param) rather than relying on the static `meta.title` key.
  - **`RealtimePlayground`** (`/playground/realtime`) — requires `can: read ObservationSnapshot`; loads `./views/RealtimePlayground.vue`.
- All entries use `meta.access: 'auth'` (authentication gate) and a per-route `meta.can` tuple (authorization gate).
- All components are lazy-loaded via dynamic `import()`.

## Relationships

- **`src/modules/observability/module.ts`** — Registers/mounts this route array into the application's module-level router configuration.
- **`src/modules/observability/tests/routes.spec.ts`** — Tests the route records exported here (structure, meta, permissions).

## Notes

- The `can` permission on `AuditLog` (`read AuditLog`) is deliberately a *different* resource from the `ObservabilitySnapshot` used by the other two routes, reflecting the file's docblock note that it is "a genuinely different, tenant-scoped rule."
- `meta.customHero` on the audit route is not a standard Vue Router field; it is consumed by the shared layout/PageHeader component. The static `meta.title` still drives `document.title` even when `?target=` is present.
- The array uses `satisfies RouteRecordRaw[]` rather than a type annotation, preserving the literal type for tooling while still checking conformance.
