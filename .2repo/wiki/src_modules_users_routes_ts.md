# src/modules/users/routes.ts

## Purpose

Declares the four route records for the users module (list, create, detail, edit). Each record pairs a URL path with a lazy-loaded Vue component and an `admin`-only `meta.access` guard, and the array is typed as `RouteRecordRaw[]` for registration into the app's Vue Router.

## Key elements

- **Default export (array of 4 `RouteRecordRaw` objects):**
  - `UsersList` — `users` → `UsersList.vue`
  - `UserCreate` — `users/create` → `UserCreate.vue`
  - `UserTarget` — `users/:id` → `User.vue` (passes route params via `props: true`)
  - `UserEdit` — `users/:id/edit` → `UserEdit.vue` (passes route params via `props: true`)
- **`meta` on every record:** `access: 'admin'` (consumed by the router guard) and a dotted `title` key (e.g. `users-list-page.page-title`) for i18n-driven page headers.
- **`component` field:** all use dynamic `import()` for code-splitting.

## Relationships

- **`src/modules/users/module.ts`** — imports this default array and mounts it into the application's module/route registry, making these paths part of the global route table.
- **`src/modules/users/tests/routes.spec.ts`** — unit-tests the exported array (shape, paths, names, meta, and prop-passing configuration).

## Notes

- All four routes are `admin`-only; there is no public or read-only variant in this file.
- `users/:id` and `users/:id/edit` enable `props: true`, so the target components receive `id` as a regular prop rather than reading from `$route.params` directly.
- The `title` values are i18n key paths (not literal strings); the actual label resolution happens elsewhere in the app shell.
- The trailing `as RouteRecordRaw[]` cast is required because the array literal's inferred type widens `meta` and `component` fields; removing it will produce a type error at the call site in `module.ts`.
