---
source: scripts/contracts/permission-actions-render.ts
sha256: 400c6abfac627a5a366dbab80ce7d93a9f7e01a30502469fce1413ad781abd8d
generated_at: 2026-10-02T11:29:23.438054+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/permission-actions-render.ts

## Purpose

The pure, side-effect-free half of the permission-action code generator. It reads the `actions:` list out of the shared `authorization-keys.yaml` document and renders the TypeScript module that carries that list as a frozen array plus a union type. All I/O lives in the sibling script; this file exists so the logic can be unit-tested without touching the filesystem.

## Key elements

- **`readPermissionActions(yamlText: string): string[]`** — Parses the YAML string, extracts `actions:`, and validates it (must be a non-empty array of unique strings). Throws a descriptive `Error` on any violation. Returns the actions in declared order.
- **`renderPermissionActions(actions: readonly string[]): string`** — Produces the full text of the generated module: a `PERMISSION_ACTIONS` const array and a `PermissionAction` union type derived from it. Output is prefixed with a "DO NOT EDIT / GENERATED" banner referencing `npm run gen:api`.

## Relationships

- **`scripts/contracts/generate-permission-actions.ts`** — The orchestrator that imports both exports from this file. It reads `authorization-keys.yaml` from disk, calls `readPermissionActions` on the raw text, pipes the result through `renderPermissionActions`, and writes the generated file. This file is intentionally I/O-free so that script handles all filesystem concerns.

## Notes

- Marked as a **SHARED SCRIPT**: kept byte-identical across both repos in the pair (same pattern as `generate-error-codes.ts`). Do not add repo-specific logic here.
- The rendered output uses `JSON.stringify` for each action value, so any YAML string containing special characters will be correctly escaped in the generated code.
- Validation order matters: the function checks *array → non-empty → all strings → no duplicates* in that sequence; a non-array input will hit the first guard before the `every` call.
- The generated type is `(typeof PERMISSION_ACTIONS)[number]`, so it stays in sync with the array without a separate literal union.
