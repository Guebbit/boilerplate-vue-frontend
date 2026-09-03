# src/modules/users/response-schemas.ts

## Purpose

Declares the response-schema contracts for every users-domain endpoint the module consumes. Each row pairs an HTTP method + path regex with a Zod schema, so the shared response-schema-map infrastructure can validate API responses at runtime. It exists to isolate the users domain's contract declarations in one table that the module manifest registers centrally.

## Key elements

- **`usersResponseSchemas`** (`ResponseSchemaRoute[]`) — The sole export. An ordered list of 10 rows, each with:
  - `method` — HTTP verb (GET, POST, PUT, DELETE).
  - `pattern` — An anchored regex matching the route path (e.g. `/^\/users\/[^/]+$/` for by-id routes).
  - `schema` — A Zod response envelope imported from `@api/schemas`.

## Relationships

- **`src/modules/users/module.ts`** — Registers `usersResponseSchemas` in its module manifest. Enabling the users module activates these validations; removing the module folder disables them. This file does not import the manifest; the dependency is one-directional (module → response-schemas).

## Notes

- All patterns are fully anchored (`^…$`); partial or prefix matching is never intended.
- The `[^/]+` segment captures a single path segment (user ID) and intentionally does **not** match nested paths — that's why `/users/:id/hard` and `/users/:id/2fa` are separate rows.
- Schema names come from `@api/schemas` and use a `*Response` suffix convention; the file adds no schema logic itself, it only wires them to routes.
- Because it is a `@module` (single named export consumed as a side-effect table), there is no per-function API surface to document beyond the array shape.
