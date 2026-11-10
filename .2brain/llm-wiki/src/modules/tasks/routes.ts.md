---
source: src/modules/tasks/routes.ts
sha256: a6ace29f98efde37ab857c7bb81faec54800200d07b7a8e3e6060319d73eb6ab
signature: a6ace29f98efde37ab857c7bb81faec54800200d07b7a8e3e6060319d73eb6ab
generated_at: 2026-11-10T05:56:51.912151+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/routes.ts

## Purpose

Defines the three route records for the tasks module (public contact form, staff task inbox, and single-task detail page) and exports them as a typed `RouteRecordRaw[]` array for the app's module registry to mount.

## Key elements

- **Default export** — An array of three `RouteRecordRaw` objects:
  - **`Contact`** (`/tasks/contact`) — Public route; no auth or permission meta. Lazy-loads `./views/Contact.vue`.
  - **`TaskInbox`** (`/tasks/tasks`) — Requires `auth` access and `read Task` permission. Lazy-loads `./views/TaskInbox.vue`.
  - **`TaskDetail`** (`/tasks/tasks/:id`) — Same auth/permission requirements as TaskInbox. Lazy-loads `./views/TaskDetail.vue`.
- **`meta.title`** — Every route uses an i18n key (`*.page-title`) rather than a literal string.
- **`satisfies RouteRecordRaw[]`** — The array is type-checked against Vue Router's route type while preserving the literal array shape for downstream consumption.

## Relationships

- **`src/modules/tasks/module.ts`** — Consumes this file's default export and registers the routes under the app's module-level route tree.
- **`src/modules/tasks/tests/routes.spec.ts`** — Unit-tests the route definitions (paths, names, meta, and component references) against expected values.

## Notes

- The path segment is `tasks/tasks` (not just `tasks`) because the module itself is mounted under a `/tasks` prefix by the module registry; the second `tasks` segment distinguishes the inbox from other potential siblings.
- All component imports are lazy (`() => import(…)`); there are no eager imports here.
- The `can` permission uses the tuple form `['read', 'Task']` rather than a single string; downstream authorization logic must handle both shapes.
