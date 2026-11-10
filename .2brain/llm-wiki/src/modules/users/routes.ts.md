---
source: src/modules/users/routes.ts
sha256: 630f01a5535fae657f3f14d55a21f8f178f7c9fbb112b439617f79cd2cc6e3da
signature: 630f01a5535fae657f3f14d55a21f8f178f7c9fbb112b439617f79cd2cc6e3da
generated_at: 2026-11-10T06:04:45.342876+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/routes.ts

## Purpose

Declares the route table for the users module. Each record pairs a URL path with a lazy-loaded Vue component and the `meta` fields (access level, capability check, i18n title) that the router guard evaluates before allowing navigation.

## Key elements

- **Default export** — an array satisfying `RouteRecordRaw[]` with four entries:
  - `UsersList` (`users`) — list view; requires `read` capability on `User`.
  - `UserCreate` (`users/create`) — creation form; requires `create` capability on `User`.
  - `UserTarget` (`users/:id`) — detail view; `props: true` passes `:id` as a prop; requires `read` capability.
  - `UserEdit` (`users/:id/edit`) — edit form; `props: true` passes `:id` as a prop; requires `update` capability.
- All routes share `meta.access: 'auth'`, meaning they are gated behind authentication.
- All `component` fields use dynamic `import()` for code-splitting.
- `meta.title` values are i18n keys (e.g. `users-list-page.page-title`).

## Relationships

- **`src/modules/users/module.ts`** — Registers this route array into the application's module registry so the router can resolve `/users*` paths.
- **`src/modules/users/tests/routes.spec.ts`** — Unit-tests the exported route array (paths, names, meta fields, lazy imports).

## Notes

- Uses `satisfies RouteRecordRaw[]` (not a plain type annotation), so the inferred element type retains the specific `meta` shape rather than widening to the base `RouteRecordRaw` type.
- Route ordering matters: `users/create` is listed before `users/:id` so the static segment wins over the parameterized one.
- `props: true` is only set on the two `:id` routes; the list and create routes intentionally omit it.
