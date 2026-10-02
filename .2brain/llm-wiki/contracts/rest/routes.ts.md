---
source: contracts/rest/routes.ts
sha256: 83432f08069864a1f4f39b7afb52abb79fc82bf09483b55c502cc0968391c80b
generated_at: 2026-10-02T14:30:58.216404+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/routes.ts

## Purpose

Auto-generated lookup table of every REST operation declared in `openapi.yaml`. It maps each HTTP method + path pattern to the response-schema name, optional request-body schema name, and owning backend module. It exists so runtime components (e.g. `response-schema-map.ts`) can resolve concrete `@api/schemas` types without parsing the OpenAPI document at runtime.

## Key elements

- **`GeneratedRoute`** (interface) — Shape of one route row: `method` (HTTP verb), `pattern` (anchored `RegExp`), `schemaName` (response schema), `bodySchemaName` (request body schema, `undefined` for bodyless ops), `module` (backend `x-module` stamp, `undefined` for system endpoints like health/livez/security.txt).
- **`ROUTES`** (const, `GeneratedRoute[]`) — Flat, ordered array covering every operation in the API (account, cart, orders, payments, products, inventory, feedback, locales, observability, api-keys, audit, antibot, delivery, and system endpoints). This is the single source the rest of the contract layer consumes.

## Relationships

No graph neighbors are recorded for this file. It is a leaf export consumed by other modules (notably `src/infrastructure/http/response-schema-map.ts` per the inline JSDoc reference) but does not import from any sibling in this repo's dependency graph.

## Notes

- **Generated — do not edit.** The source of truth is `openapi.yaml`; regenerate with `npm run gen:api`. Hand edits will be overwritten.
- `pattern` values are **anchored** (`^…$`) and contain no capture groups; they are meant for direct `RegExp.test(path)` matching.
- `bodySchemaName` is `undefined` for all `GET`/`DELETE` routes (and a few `POST` routes like `POST /account/export`, `POST /account/logout`), indicating no request-body validation applies.
- `module` is `undefined` only for system endpoints (`.well-known/security.txt`, `/`, `/livez`); every business endpoint carries a module tag that mirrors the backend service directory.
- The array is long (100+ entries) and truncated in most views; search by `schemaName` or path fragment rather than reading top-to-bottom.
