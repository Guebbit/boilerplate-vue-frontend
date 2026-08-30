# src/modules/users/response-schemas.ts

## Purpose

Declares the complete set of Zod response-schema contracts for the users domain's outbound API calls. Each row pairs an HTTP method and a path-regex pattern with the schema that validates the response envelope. The list is consumed by the `response-schema-map` infrastructure to perform runtime contract validation on every users endpoint response.

## Key elements

- **`usersResponseSchemas: ResponseSchemaRoute[]`** — The single export. A flat array of nine `{ method, pattern, schema }` rows covering:
  - `GET /users` → `ListUsersResponse`
  - `POST /users` → `CreateUserResponse`
  - `PUT /users` → `UpdateUserResponse`
  - `DELETE /users` → `DeleteUserResponse`
  - `POST /users/search` → `SearchUsersResponse`
  - `GET /users/:id` → `GetUserByIdResponse`
  - `PUT /users/:id` → `UpdateUserByIdResponse`
  - `DELETE /users/:id` → `DeleteUserByIdResponse`
  - `DELETE /users/:id/hard` → `HardDeleteUserByIdResponse`
- **`@api/schemas`** — All Zod schemas are imported from this shared API-schemas package; this file contains no schema definitions of its own.
- **`ResponseSchemaRoute`** (from `@/infrastructure/http/response-schema-map`) — The type each row conforms to; it defines the `method`, `pattern`, and `schema` shape.

## Relationships

- **`src/modules/users/module.ts`** — Registers `usersResponseSchemas` in the domain's module manifest. Enabling or disabling the users domain (or deleting the folder) toggles contract validation for all nine routes without any additional wiring.

## Notes

- Path patterns are anchored regexes (`^…$`), not plain strings; the `:id` segments use `[^/]+` so `/users/123/hard` does not accidentally match the plain `/users/:id` delete.
- Because the list is a plain array, order matters if the infrastructure does first-match dispatch — `/users/search` and `/users/:id/hard` are placed after the generic `/users/:id` entries to avoid shadowing.
