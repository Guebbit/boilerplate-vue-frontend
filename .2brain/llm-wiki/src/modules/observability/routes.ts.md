---
source: src/modules/observability/routes.ts
sha256: f12b47f46b82c42ae70bf6ea09fe0ba7308ec1ea005ac0e8245e7f5d05c40c69
generated_at: 2026-10-17T01:11:40.577701+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/routes.ts

## Purpose

Defines the route table for the observability domain (admin console, audit log, realtime SSE playground). Each route is auth-gated, permission-checked via `meta.can`, and lazy-loaded so its view bundle only fetches when a visitor who actually holds the required permission navigates to it.

## Key elements

- **Default export** — an array of three `RouteRecordRaw` records typed with `satisfies RouteRecordRaw[]`.
- **`admin`** (`Admin.vue`) — platform-operator console; requires `read` on `ObservabilitySnapshot`.
- **`audit`** (`AuditLog.vue`) — tenant-scoped audit trail; requires `read` on `AuditLog`. Carries `meta.customHero: true`, signalling the view renders its own `PageHeader` (the static `title` key is still used for `document.title`, but the rendered title includes a scoped record id when `?target=` is present).
- **`playground/realtime`** (`RealtimePlayground.vue`) — realtime SSE playground over the same metrics stream; requires `read` on `ObservabilitySnapshot`.

## Relationships

- **`src/modules/observability/module.ts`** — imports this default export and registers the routes in the app's module registry.
- **`src/modules/observability/tests/routes.spec.ts`** — unit-tests the route records (paths, names, meta fields, component resolution).

## Notes

- `satisfies RouteRecordRaw[]` is used instead of a plain type annotation so the literal shape (e.g. `customHero`) is preserved for downstream consumers while still being checked against the Vue Router contract.
- The AuditLog route's `customHero` flag is the mechanism that tells the layout to skip rendering its own page header; omitting it on the other two routes means they rely on the default layout hero.
