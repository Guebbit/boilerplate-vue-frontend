---
source: scripts/contracts/generate-route-table.ts
sha256: 57f5d0d7684e190bda4326aa364dfa2e7d3dc56c768d0742dc11655522a28d89
generated_at: 2026-10-16T23:58:10.351283+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-route-table.ts

## Purpose

Code generator that reads the repo-root `openapi.yaml`, extracts one row per declared operation (HTTP method, anchored URL pattern, response/body schema export names, `x-module`), sorts them for correct `find()` resolution, and emits a TypeScript module exporting a `ROUTES: GeneratedRoute[]` array. It exists so `response-schema-map.ts` and each module's `response-schemas.ts` get their route→schema table from a single regenerated artifact rather than hand-maintained lists.

## Key elements

- **`segmentToPatternSource` / `pathToPatternSource`** — Convert an OpenAPI path template into a fully anchored (`^…$`) regex source string. `{param}` segments become `[^/]+`; literal segments are regex-escaped.
- **`schemaNameFor` / `bodySchemaNameFor`** — Derive the `@api/schemas` export names (`PascalCase(operationId) + 'Response'` / `+ 'Body'`) following orval's naming convention. Body name is `undefined` for multipart-only or bodyless operations.
- **`Row` (interface)** — Internal per-operation shape: `method`, `patternSource`, `paramCount`, `schemaName`, `bodySchemaName`, `moduleName`.
- **Main walk + sort** — Iterates `document.paths` × `OPERATION_METHODS`, collects rows, then sorts by `paramCount` ascending → `patternSource` → `method`. This ordering guarantees a literal segment wins over a `{param}` sibling at the same depth during `find()`.
- **`renderRow` + output assembly** — Renders the generated `.ts` file text (header comment, `GeneratedRoute` interface, `ROUTES` array).
- **`--out <path>` / `--check`** — CLI flags. `--check` diffs against the committed file and exits 1 on mismatch (CI contract); without it, writes the file.
- **`resolveOutputPath`** — Parses the mandatory `--out` argument, resolves relative to repo root.

## Relationships

No graph neighbors are recorded for this file. It reads `openapi.yaml` (repo root) as its sole input and its output is consumed by `src/infrastructure/http/response-schema-map.ts` and per-module `response-schemas.ts` files (referenced in the file header and generated JSDoc). It shares the `openapi-bundle.ts` → `x-module` convention with the sibling generator `generate-operation-modules.ts`.

## Notes

- **No `@api/schemas` import by design.** The emitted file keeps `schemaName` as a bare string; resolution against the real zod namespace happens only after that ~350 KB chunk loads. Importing it here would break the lazy-load path.
- **Anchoring is load-bearing.** Both `^` and `$` prevent a `[^/]+` segment from absorbing a literal at a *different* depth. Same-depth ambiguity (e.g. `/products/{id}` vs `/products/categories`) is resolved purely by sort order — fewer `{param}` segments first.
- **Sort stability matters for diffs.** Secondary sort keys (`patternSource`, then `method`) are alphabetical so that adding an unrelated operation doesn't reshuffle already-reviewed rows.
- **ESM script** (`#!/usr/bin/env tsx`, `import.meta.url` for `ROOT`). Not a CommonJS `__dirname` script.
- **`--check` is the CI gate.** Same pattern as every other generator in `scripts/contracts/`.
