---
source: scripts/contracts/generate-route-table.ts
sha256: afad66d2f7fe5ca3babe2443e6a08383e16914d29c41620679cdc3ded27d3f72
generated_at: 2026-10-02T11:29:07.376178+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-route-table.ts

## Purpose

Code generator that reads the repo's `openapi.yaml` and emits a typed `ROUTES` array (one `GeneratedRoute` row per declared operation) describing each endpoint's HTTP method, an anchored regex URL pattern, the `@api/schemas` response-envelope export name, an optional body-schema name, and the owning `x-module`. The output is consumed at runtime by `infrastructure/http/response-schema-map.ts` and by each module's own `response-schemas.ts` before the large zod schema bundle is loaded, keeping the route table a dependency-free string table.

## Key elements

- **`resolveOutputPath()`** — Parses the required `--out <path>` CLI flag; exits 1 if missing.
- **`segmentToPatternSource(segment)`** — Converts a single OpenAPI path segment to regex source: `{param}` → `[^/]+`, literals → escaped (regex metacharacters prefixed with `\`).
- **`pathToPatternSource(openApiPath)`** — Joins all segments with an explicit `\/`, anchors both ends with `^…$`.
- **`schemaNameFor(operationId)`** — Derives the response-schema export name (`PascalCase(operationId) + 'Response'`).
- **`bodySchemaNameFor(operation)`** — Returns `PascalCase(operationId) + 'Body'` only when the operation declares a JSON content-type request body; otherwise `undefined`.
- **`Row` interface** — Internal shape: `method`, `patternSource`, `paramCount`, `schemaName`, `bodySchemaName`, `moduleName`.
- **Main loop** — Iterates `document.paths` × `OPERATION_METHODS`, collects rows, sorts by `paramCount` asc → `patternSource` → `method`, then renders the full output file (interface + `ROUTES` array) as a string and either writes it or compares against the committed copy (`--check`).

## Relationships

No dependency-graph neighbors are recorded. The script is standalone: it reads only `openapi.yaml` (via `fs`/`yaml`) and writes a generated TS file. Its *output* is consumed by `infrastructure/http/response-schema-map.ts` and per-module `response-schemas.ts` files, but those are downstream consumers, not imports.

## Notes

- **Deliberate no-import of `@api/schemas`.** `schemaName`/`bodySchemaName` are bare strings in the generated file; the real namespace is resolved later by the consumer, avoiding a ~350 KB zod chunk load at route-registration time.
- **Sorting is load-bearing.** Rows with fewer `{param}` segments must precede same-method siblings with more, so `resolveResponseSchema`'s first-match `find()` picks the literal (more specific) route. Without this order, `[^/]+` would greedily absorb adjacent literal segments at the same depth.
- **`--check` mode** is the CI guard: it diffs the in-memory rendering against the committed file and exits 1 on mismatch, consistent with other generators in `scripts/contracts/`.
- **ESM context.** The script uses `import.meta.url` (not `__dirname`) to compute the repo root; it must be run via `tsx`.
- **Regenerate command:** `npm run gen:api` (per the generated file's header comment).
