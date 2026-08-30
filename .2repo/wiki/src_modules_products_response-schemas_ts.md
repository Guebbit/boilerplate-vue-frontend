# src/modules/products/response-schemas.ts

## Purpose

Declares the response-envelope schema for every products endpoint this module calls. The array is consumed by the HTTP layer's response-schema map to validate server responses against the expected contract. Enabling or deleting the products domain folder automatically turns this validation on or off via the module manifest.

## Key elements

- **`productsResponseSchemas`** (`ResponseSchemaRoute[]`) — the sole export. An ordered array of `{ method, pattern, schema }` rows covering all products routes:
  - `GET /products` → `ListProductsResponse`
  - `POST /products` → `CreateProductResponse`
  - `PUT /products` → `UpdateProductResponse`
  - `DELETE /products` → `DeleteProductResponse`
  - `POST /products/search` → `SearchProductsResponse`
  - `GET /products/categories` → `GetCatalogueFacetsResponse`
  - `GET /products/:id` → `GetProductByIdResponse`
  - `PUT /products/:id` → `UpdateProductByIdResponse`
  - `DELETE /products/:id` → `DeleteProductByIdResponse`
  - `DELETE /products/:id/hard` → `HardDeleteProductByIdResponse`
- Schemas are imported from `@api/schemas`; the `ResponseSchemaRoute` type comes from `@/infrastructure/http/response-schema-map`.

## Relationships

- **`src/modules/products/module.ts`** — the module manifest that registers this file. It wires `productsResponseSchemas` into the HTTP layer so the response-schema map can look up the correct schema per route at runtime.

## Notes

- **Row order matters.** The static `/products/categories` row must precede the `/products/[^/]+` wildcard rows because the lookup uses `find()` (first match wins). Reordering would cause the wildcard to swallow `categories`. The same convention is followed in the orders module.
- Patterns are anchored regular expressions (`^…$`), not glob strings. The by-id segments use `[^/]+` rather than a named capture group — the schema map only needs to match, not extract the id.
