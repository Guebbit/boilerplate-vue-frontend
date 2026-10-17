---
source: src/modules/users/routes.ts
sha256: 2f1eb0bcd70f57d935d59c0ad42ab38a4cf6a1a4bfcd121a09f6115bcee3ae9a
generated_at: 2026-10-17T01:46:29.769878+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/routes.ts

## Purpose

Defines the route table for the users module. Each entry pairs a URL path with a lazy-loaded Vue view and the access/permission metadata the router guard checks before allowing navigation. The array is consumed by the module registry to mount these routes under the application.

## Key elements

- **Default export (array)** — Four `RouteRecordRaw` records satisfying the type check via `satisfies RouteRecordRaw[]`:
  - **UsersList** (`/users`) — Lazy-loads `UsersList.vue`; requires `auth` + `can: ['read', 'User']`.
  - **UserCreate** (`/users/create`) — Lazy-loads `UserCreate.vue`; requires `can: ['create', 'User']`.
  - **UserTarget** (`/users/:id`) — Lazy-loads `User.vue`; `props: true` forwards the `:id` param as a component prop.
  - **UserEdit** (`/users/:id/edit`) — Lazy-loads `UserEdit.vue`; `props: true`; requires `can: ['update', 'User']`.
- **`meta.can`** — A `[verb, subject]` tuple consumed by the permission guard to enforce granular access.
- **`meta.title`** — An i18n key (e.g. `users-list-page.page-title`) rather than a literal string.

## Relationships

- **`src/modules/users/module.ts`** — Registers this route array into the app's module registry so the routes are mounted at application startup.
- **`src/modules/users/tests/routes.spec.ts`** — Unit tests that validate the shape, paths, and metadata of the exported route records.

## Notes

- **Route ordering is load-bearing.** `users/create` is declared *before* `users/:id`; reordering would cause the static `create` segment to be swallowed by the `:id` parameter.
- **`props: true`** is set only on the parameterized routes (`UserTarget`, `UserEdit`), meaning the target components receive `id` as a reactive prop rather than reading `route.params` directly.
- All routes require `access: 'auth'`; unauthenticated users are blocked at the router-guard level before the permission (`can`) check.
