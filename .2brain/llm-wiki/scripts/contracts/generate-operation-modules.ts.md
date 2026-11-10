---
source: scripts/contracts/generate-operation-modules.ts
sha256: 4bef6a947b05cc4319c668bd8b56e26d086874020ed0fbe354977ec1003d671d
signature: 3fcd6f2f9d4691de5ef8b6cb199122194399792e6fe868f1229566d8fe3409f4
generated_at: 2026-11-10T02:24:49.642130+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-operation-modules.ts

## Purpose

Generates a `Record<string, string>` mapping every orval-generated `@api` function name to the backend module that owns its operation, derived from `x-module` stamps in `openapi.yaml`. It exists so that `tests/cross-cutting/module-coupling.spec.ts` has a contract-sourced ground truth to verify a module isn't importing another domain's endpoint, without hand-maintaining the map.

## Key elements

- **`OpenApiOperation` / `OpenApiDocument`** — Minimal interfaces describing the slice of the OpenAPI doc this script reads (avoids pulling a full OpenAPI type dependency).
- **`resolveOutputPath()`** — Parses the required `--out <path>` CLI flag; exits 1 if missing.
- **`OPERATION_METHODS`** — The eight HTTP verbs walked per path item.
- **`isOperation()`** — Type guard narrowing a path-item entry to `OpenApiOperation`.
- **`functionNames(operationId, operation)`** — Mirrors `orval.config.ts`'s `contentTypeOperationNames` rule: a single-content-type operation keeps its plain `operationId`; one with multiple content types (JSON + multipart) yields both `operationId` and `operationId` with the `WithMultipart` suffix.
- **Main walk (bottom of file)** — Iterates every path → method, collects `[functionName, moduleName]` pairs (skipping paths with no `x-module`), sorts alphabetically, and emits the generated TS file.
- **`--check` mode** — Compares generated output against the committed file on disk; exits 1 on mismatch instead of writing.

## Relationships

The dependency graph reports no formal neighbors for this file. It is a standalone generator script: it reads `openapi.yaml` and writes (or checks) the output file specified by `--out`.

## Notes

- **Manual sync obligation:** `functionNames()` duplicates orval's multipart-splitting logic. If `orval.config.ts` changes that rule, this script must be updated in the same PR — the coupling test will catch a mismatch but won't fix it.
- **ESM:** The script uses `import.meta.url` (not `__dirname`) because it runs as ESM via `tsx`.
- **`--check` contract:** Exits 1 with a "Run `npm run gen:api`" hint on mismatch — the same pattern used by `generate-asyncapi-types.ts`.
- **System endpoints:** Paths lacking `x-module` (a handful of root-level system endpoints) are silently skipped; no entry is emitted for them.
- **Generated output is sorted** by function name (locale order) for stable diffs.
