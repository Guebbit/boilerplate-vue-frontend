---
source: scripts/contracts/generate-operation-modules.ts
sha256: 79bb312bc6fa32065b10bdb9f734b8a025ddf0e0d13909a3e6ea461e1f9ad433
generated_at: 2026-10-02T11:28:32.566933+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-operation-modules.ts

## Purpose

Generates a TypeScript map (`OPERATION_MODULES`) that links every orval-produced `@api` function name to the backend module owning its OpenAPI operation, sourced from `x-module` extension stamps in `openapi.yaml`. It exists so cross-cutting coupling tests have a single, auto-maintained reference instead of a hand-written list, and so `--check` can detect drift in CI.

## Key elements

- **`functionNames(operationId, operation)`** – Mirrors orval's `contentTypeOperationNames` rule: if an operation's `requestBody.content` has more than one content type, it returns both `operationId` and `` `${operationId}WithMultipart` ``; otherwise just `operationId`.
- **`resolveOutputPath()`** – Parses the required `--out <path>` CLI argument; exits 1 if missing.
- **`checkOnly`** – Boolean flag from `--check`; when true the script compares its in-memory output against the committed file and exits 1 on mismatch instead of writing.
- **Main loop** – Iterates `document.paths`, then the eight `OPERATION_METHODS`, collecting `[functionName, moduleName]` pairs for operations that have both an `operationId` and an `x-module` stamp. Paths lacking either are skipped (system endpoints).
- **Generated output** – A small `.ts` file exporting `OPERATION_MODULES: Record<string, string>`, with a "DO NOT EDIT" header and regeneration instructions.
- **`isOperation`** – Type guard narrowing a path-item value to the minimal `OpenApiOperation` shape the script reads.

## Relationships

No formal graph neighbors are registered, but the script has explicit runtime/textual interactions:

- **Reads** `openapi.yaml` at the repo root (produced by the backend's `scripts/contracts/openapi-bundle.ts`).
- **Output is consumed by** `tests/cross-cutting/module-coupling.spec.ts`, which compares a module's imports against `MODULE_EDGES` using this map.
- **Mirrors** the naming logic in `orval.config.ts` (`contentTypeOperationNames`). The two are kept in sync by hand; the coupling spec catches drift in either direction.
- **Follows the same `--check` contract** as `generate-asyncapi-types.ts`.

## Notes

- The script must be run with `tsx` (ESM); it resolves `ROOT` via `import.meta.url`, not `__dirname`.
- The `functionNames` helper is a **manual mirror** of orval's transformer — there is no import or shared source. If `orval.config.ts` changes the split/rename rule, this file must be updated in the same commit, or `tests/cross-cutting/module-coupling.spec.ts` will fail.
- Operations without `x-module` (a handful of root-level system endpoints) are silently excluded; the generated map will not contain them.
- In `--check` mode the script does **not** write the file; it only compares and exits with code 1 on mismatch, printing the `npm run gen:api` remediation command.
