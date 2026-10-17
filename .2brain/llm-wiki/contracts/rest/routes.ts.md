---
source: contracts/rest/routes.ts
sha256: e620697712662a6b559c2e7c6679e6ba8b47904970eb20a0e9c42aae772a4b72
generated_at: 2026-10-16T23:55:03.182333+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/routes.ts

## Purpose

Auto-generated route table for the REST API contract. It is produced by `npm run gen:api` from `openapi.yaml` and provides a flat, typed list of every HTTP operation (method + path pattern) along with the schema names the backend must validate. It serves as the single source of truth the response-validation layer and schema-lookup machinery iterate over.

## Key elements

- **`GeneratedRoute` (interface)** — The shape of one route entry: `method`, `pattern` (anchored `RegExp`), `schemaName` (response schema in `@api/schemas`), `bodySchemaName` (request-body schema, `undefined` for GET/DELETE/etc.), and `module` (the backend `x-module` stamp; `undefined` for system endpoints like `/livez`, `/`, security.txt).
- **`ROUTES` (const, `GeneratedRoute[]`)** — The full array of every declared operation. Ordered by path. Includes account, cart, inventory, delivery, notifications, locales, feedback, analytics, api-keys, audit, examples, and other modules.

## Relationships

No graph-level dependencies are tracked for this file. Its doc comments reference `src/infrastructure/http/response-schema-map.ts` (`ResponseSchemaRoute`) and the `@api/schemas` package, indicating those consumers resolve the `schemaName` / `bodySchemaName` strings against the real schema namespace at runtime.

## Notes

- **Do not edit manually.** Any change belongs in `openapi.yaml`; regenerate with `npm run gen:api`.
- `pattern` is a full-anchored `RegExp` (`^…$`), not a string path — matching is done via `.test()` or similar, not route-string comparison.
- `module` is `undefined` for the handful of system/infrastructure endpoints (health, livez, security.txt) that no business module owns; consumers must treat it as optional.
- `bodySchemaName` is `undefined` whenever the operation has no JSON request body (all GETs, DELETEs, and a few POSTs like token refresh).
- The file is truncated in this view; the full array is longer than what is shown here.
