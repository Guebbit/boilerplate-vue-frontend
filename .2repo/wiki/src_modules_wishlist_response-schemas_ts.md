# src/modules/wishlist/response-schemas.ts

## Purpose

Declarative table that maps every wishlist endpoint (method + URL pattern) to its response-envelope schema. The HTTP layer consumes this array to perform runtime contract validation on outbound responses.

## Key elements

- **`wishlistResponseSchemas`** (exported const, type `ResponseSchemaRoute[]`) — the sole export. Four entries:
  - `GET /^\/wishlist$/` → `schemas.GetWishlistResponse`
  - `POST /^\/wishlist$/` → `schemas.AddWishlistItemResponse`
  - `DELETE /^\/wishlist\/[^/]+$/` → `schemas.RemoveWishlistItemResponse`
  - `POST /^\/wishlist\/[^/]+\/move-to-cart$/` → `schemas.MoveWishlistItemToCartResponse`
- All schema objects are re-exported from `@api/schemas`; this file contains no schema definitions of its own.

## Relationships

- **`src/modules/wishlist/module.ts`** — Imports (or references) `wishlistResponseSchemas` and registers the table through the module manifest so the HTTP layer can discover it at runtime.

## Notes

- URL patterns are **anchored** regexes; the `[^/]+` segments match a single path segment (item ID) and intentionally do not cross `/` boundaries.
- The `ResponseSchemaRoute` type is defined in the infrastructure layer (`@/infrastructure/http/response-schema-map`), not in this module — adding a new endpoint row means only touching this file, not the type definition.
- The file is purely a flat mapping table; no logic, no branching, no side effects.
