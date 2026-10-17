---
source: scripts/contracts/generate-operation-modules.ts
sha256: 23c008320109d4b9254f71e8b0debd301445bfbf72d08b811b35fb42864d1e54
generated_at: 2026-10-16T23:57:47.661708+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-operation-modules.ts

## Purpose

Reads `openapi.yaml` and emits a TypeScript file exporting an `OPERATION_MODULES` record that maps every generated `@api` function name to the backend module owning that operation (via the `x-module` extension). This gives `tests/cross-cutting/module-coupling.spec.ts` a concrete map to verify a module isn't importing another domain's endpoint — something the contract itself never states.

## Key elements

- **`OpenApiOperation` / `OpenApiDocument`** — Minimal interfaces for the YAML slice this script reads (`operationId`, `x-module`, `requestBody.content`, `paths`).
- **`resolveOutputPath()`** — Parses the required `--out <path>` CLI argument into an absolute path.
- **`OPERATION_METHODS`** — The eight HTTP verbs walked under each path item.
- **`isOperation(value)`** — Type guard narrowing a path-item value to `OpenApiOperation`.
- **`functionNames(operationId, operation)`** — Resolves the one-or-two generated function names for an operation. Mirrors `contentTypeOperationNames` in `orval.config.ts`: a single content type yields `[operationId]`; multiple (e.g. JSON + multipart) yields `[operationId, operationIdWithMultipart]`.
- **Main loop + output assembly** — Iterates every path × method, collects `[name, module]` pairs (skipping operations without `operationId` or `x-module`), sorts by name, and renders the full generated file text (header comment + `export const OPERATION_MODULES: Record<string, string> = { … }`).
- **`--check` mode** — When present, compares the freshly generated text against the committed file and exits 1 on mismatch (same contract as `generate-asyncapi-types.ts`).

## Relationships

The dependency graph lists no direct import/export neighbors for this file. Its docstring identifies the surrounding context:

- **Reads** `openapi.yaml` (the bundled root contract, produced by the backend's `scripts/contracts/openapi-bundle.ts`).
- **Mirrors naming logic** in `orval.config.ts` (`contentTypeOperationNames`) — kept in sync by hand.
- **Output is consumed by** `tests/cross-cutting/module-coupling.spec.ts`, which cross-references the map against `MODULE_EDGES`.

## Notes

- `functionNames` and `orval.config.ts`'s `contentTypeOperationNames` are **duplicated logic** with no shared import; a change to one without the other will cause `module-coupling.spec.ts` to fail on a name mismatch in either direction.
- The script resolves `ROOT` via `import.meta.url` (ESM context, no `__dirname`).
- Operations lacking `x-module` (a handful of system-level endpoints declared directly on the root document) are silently skipped — they have no owning module.
- The `yaml` package's `parse` returns `any`; the `as OpenApiDocument` cast narrows to the fields actually read. There is no full OpenAPI schema validation.
- Generated output is sorted alphabetically by function name for deterministic diffs.
