# src/modules/admin/response-schemas.ts

## Purpose

Declarative contract-validation table for the admin domain. It lists, per admin endpoint the module calls, the exact HTTP method, a regex path pattern, and the Zod schema the response envelope must satisfy. A response-schema-map middleware reads this array at runtime to validate inbound API responses against the declared shape.

## Key elements

- **`adminResponseSchemas: ResponseSchemaRoute[]`** — The sole export. An array of five entries, each binding a `method` (`GET`), a `pattern` (anchored regex), and a `schema` (Zod response type imported from `@api/schemas`). Covers the observability endpoints: `/events`, `/health`, `/metrics`, `/metrics/overview`, `/audit`.
- **`ResponseSchemaRoute`** (type import from `@/infrastructure/http/response-schema-map`) — The row shape every entry conforms to; its docblock states the two invariants all rows must obey.

## Relationships

- **`src/modules/admin/module.ts`** — Registers `adminResponseSchemas` in the admin module manifest, which is how the middleware discovers and activates these contracts. Enabling the admin module turns response validation on; removing the folder turns it off.
- **`@api/schemas`** — Provides the individual Zod response schemas (`GetObservabilityEventsResponse`, `GetObservabilityHealthResponse`, etc.) referenced in each row.
- **`@/infrastructure/http/response-schema-map`** — Supplies the `ResponseSchemaRoute` type and, at runtime, the middleware that consumes this array.

## Notes

- The `pattern` values are **regexes**, not string paths; the anchors (`^…$`) mean the match is exact and order-independent, but adding a new endpoint requires a precise regex rather than a glob or partial match.
- Adding a new admin endpoint to the module means adding a corresponding row here; omitting it means that endpoint's response will not be schema-validated by the middleware.
- The file contains no logic—only data—so changes are purely additive (new rows) or removal (deleted rows) and should be reviewed alongside the matching `@api/schemas` export.
