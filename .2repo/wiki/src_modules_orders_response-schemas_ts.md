# src/modules/orders/response-schemas.ts

## Purpose
Declarative table that maps every orders REST endpoint (method + path regex) to its Zod response schema. It plugs into the `response-schema-map` infrastructure so that API responses are validated against the shared `@api/schemas` contracts. Enabling or deleting the orders module folder toggles this validation on/off automatically.

## Key elements
- **`ordersResponseSchemas`** (exported const, type `ResponseSchemaRoute[]`) — the sole export. An array of 11 route entries covering:
  - `GET/POST/PUT/DELETE /orders` (collection-level CRUD)
  - `POST /orders/search`
  - `GET /orders/:id/invoice`
  - `GET/PUT/DELETE /orders/:id`
  - `DELETE /orders/:id/hard`
  - `POST /orders/:id/cancel`

  Each row pairs a `method`, a `pattern` (anchored regex), and a `schema` from `@api/schemas`.

## Relationships
- **`src/modules/orders/module.ts`** — imports `ordersResponseSchemas` and registers it in the module manifest, which is how the response-schema-map infrastructure discovers and activates these routes when the orders domain is enabled.

## Notes
- Path patterns are anchored regexes (`^…$`); sub-path segments like `invoice` and `hard` are listed *before* the bare `:id` catch so more specific routes match first (order matters in the array).
- The file contains no logic — it is purely a static data table. All validation behavior lives in the `response-schema-map` consumer and the Zod schemas in `@api/schemas`.
- Adding a new orders endpoint requires a new row here; forgetting it means that endpoint's response goes unvalidated.
