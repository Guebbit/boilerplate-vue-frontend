# src/modules/cart/response-schemas.ts

## Purpose

Declares the runtime contract-validation table for the cart domain: a flat array mapping each HTTP method + URL pattern to a Zod (or similar) response schema. The HTTP layer looks up a response against this table to validate it before handing it to the caller.

## Key elements

- **`cartResponseSchemas: ResponseSchemaRoute[]`** — The sole export. Nine rows covering GET/POST/PUT/DELETE on `/cart`, `/cart/summary`, `/cart/checkout`, `/cart/all`, `/cart/:id`, and `/cart/reorder/:id`. Each row pairs an HTTP method, a regex `pattern`, and a schema imported from `@api/schemas`.
- **`ResponseSchemaRoute` (type import)** — From `@/infrastructure/http/response-schema-map`; defines the `{ method, pattern, schema }` shape and documents the two invariants every row must satisfy.
- **Schema imports** — All response shapes are re-exported from `@api/schemas` (e.g. `GetCartResponse`, `CheckoutResponse`, `ReorderResponse`).

## Relationships

- **`src/modules/cart/module.ts`** — The module manifest imports `cartResponseSchemas` and registers it with the HTTP layer. Enabling the cart domain (i.e. including the module) automatically activates contract validation for these routes; removing the folder disables it. No other code reads this array directly.

## Notes

- **Ordering matters.** The lookup uses `Array.find()`, which returns the *first* match. Static-segment rows (e.g. `/cart/all`) must appear before any wildcard row (`/cart/[^/]+`) whose pattern would also match them. The inline comment calls out that the `/cart/all` row is intentionally placed before the by-id rows for exactly this reason.
- **One table per domain module.** This file is the cart-specific fragment; the HTTP layer aggregates all module tables. There is no per-file runtime logic—just data and a type annotation.
