# src/modules/cart/response-schemas.ts

## Purpose

Declares the flat array of response-schema rows the HTTP layer matches against at runtime to validate that cart-endpoint responses conform to their expected contracts. The array is registered through the module manifest so that contract validation activates automatically when the cart domain is enabled.

## Key elements

- **`cartResponseSchemas: ResponseSchemaRoute[]`** — the sole export. An 8-row table mapping each cart route (method + regex pattern) to a Zod-style response schema from `@api/schemas`. Covers `GET/POST/DELETE /cart`, `GET /cart/summary`, `POST /cart/checkout`, `PUT/DELETE /cart/:id`, and `POST /cart/reorder/:id`.

## Relationships

- **`src/modules/cart/module.ts`** — The module manifest imports `cartResponseSchemas` and registers it with the HTTP response-schema map infrastructure. Registering it here is what turns runtime contract validation on for the cart domain; removing the file (and its import in `module.ts`) disables it.

## Notes

- The two invariants every row must satisfy (e.g. `pattern` must be anchored, `schema` must parse the full envelope) are documented on the `ResponseSchemaRoute` type in `@/infrastructure/http/response-schema-map`, not repeated here.
- Patterns are anchored regexes (`^…$`); the `PUT`/`DELETE` item routes use `[^/]+` to match a single path segment, and the reorder route adds a `reorder` prefix before the ID.
- Adding a new cart endpoint means adding exactly one row to this array—no separate registration step is needed as long as `module.ts` still imports the export.
