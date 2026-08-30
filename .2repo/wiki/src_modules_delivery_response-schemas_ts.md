# src/modules/delivery/response-schemas.ts

## Purpose

Declares the response-envelope schemas for every delivery endpoint this module's client functions call. The list is consumed by the HTTP layer to validate each response against the expected shape before it reaches application code.

## Key elements

- **`deliveryResponseSchemas`** (`ResponseSchemaRoute[]`) — Flat array of `{ method, pattern, schema }` rows, one per endpoint. Registered via the module manifest so the HTTP layer can match responses by HTTP method and URL regex.
  - `GET /delivery/methods` → `schemas.ListShippingMethodsResponse`
  - `GET /delivery/order/:id` → `schemas.GetShipmentByOrderResponse`
  - `POST /delivery/advance` → `schemas.AdvanceCourierResponse`

## Relationships

- **`src/modules/delivery/module.ts`** — The module manifest imports `deliveryResponseSchemas` and includes it in the delivery module's registration, making these routes visible to the HTTP layer's response-validation pipeline.

## Notes

- URL patterns are **anchored regexes** (`^…$`), not path strings; adding a new endpoint requires a correctly anchored pattern to avoid partial matches.
- Schemas are imported from `@api/schemas` (shared API contract), not defined locally. If the API changes, update the shared schema package, not this file.
- The file is intentionally a flat list with no grouping logic—ordering and matching semantics are defined by `ResponseSchemaRoute` in `@/infrastructure/http/response-schema-map`.
