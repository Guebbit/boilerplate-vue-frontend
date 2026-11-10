---
source: scripts/contracts/generate-route-table.ts
sha256: d37f225bbe168d4e410d1ee39b37eb7d58b3e7bcbcaa510918edb4810573266e
signature: ea87c83818e356874895b7ac5829ecb72c1150ff9b35f60138fb2b7ee74874c7
generated_at: 2026-11-10T02:25:25.098861+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-route-table.ts

## Purpose

Code generator that reads the bundled `openapi.yaml` and emits a route-table file (one row per operation) containing the HTTP method, an anchored URL regex, the `@api/schemas` export name for the response body, the body-schema name, the owning `x-module`, a `noRefresh` flag, and `REDIRECT_QUERY_ENUMS`. It exists so `response-schema-map.ts` and each module's `response-schemas.ts` can resolve their routes *before* the ~350 KB zod schema chunk is loaded.

## Key elements

- **`segmentToPatternSource` / `pathToPatternSource`** — Convert an OpenAPI path template into a fully-anchored (`^…$`) regex source; `{param}` → `[^/]+`, literal segments get their metacharacters escaped.
- **`schemaNameFor` / `bodySchemaNameFor`** — Derive the `@api/schemas` export name via orval's convention (`PascalCase(operationId)` + `"Response"` / `"Body"`). Body name is `undefined` when no JSON content type is declared.
- **`collectRedirectEnums`** — Harvests `x-redirect-query` enums from every response into a flat `operationId → param → string[]` map.
- **`rows` + sort** — One entry per operation with an `operationId`; sorted by `paramCount` ascending, then alphabetically, so fewer-param (more literal) paths precede param siblings at the same depth.
- **`renderRow` / `output`** — Renders the final TypeScript file: the `GeneratedRoute` interface, the `ROUTES` array, and the `REDIRECT_QUERY_ENUMS` const.
- **`--check` mode** — Compares generated text against the committed file; exits 1 on mismatch (the standard generator contract).

## Relationships

- **`contracts/rest/routes.ts`** — The `--out` target for the generated file. `routes.ts` imports the exported `ROUTES` array and `REDIRECT_QUERY_ENUMS` to drive route matching and redirect validation.
- **`github/workflows/ci.yml`** — Invokes this script with `--check` in CI to fail the build if the committed route table has drifted from what `openapi.yaml` currently declares.

## Notes

- **No `@api/schemas` import by design.** `schemaName` and `bodySchemaName` are bare strings; they are resolved against the real namespace only after that namespace is imported elsewhere. Importing the schemas here would pull the full zod chunk into the route-table's load path.
- **Sort order is load-bearing.** `find()` on `ROUTES` returns the first match, so at a given method the literal path (fewer `{param}` segments) must appear before its param-sibling. Re-sorting without preserving this order silently breaks matching (e.g. `/products/facets` vs `/products/{id}`).
- **`bodySchemaName` is conditional.** It is `undefined` for operations that only send multipart or have no body at all; consumers must handle the optional case.
- **ESM context.** The script uses `import.meta.url` (not `__dirname`) to resolve paths; it is invoked via `tsx`.
