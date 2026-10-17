---
source: scripts/contracts/generate-permission-actions.ts
sha256: 794f26c374990a4ef984f798954c549faab44654e6840bb187c72d4da35c4f49
generated_at: 2026-10-16T23:57:56.180638+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-permission-actions.ts

## Purpose

Generates a TypeScript `permission-actions` module (a runtime array plus a derived union type) from the `actions:` section of an `authorization-keys.yaml` file. It exists to keep the permission-action vocabulary in code in lockstep with the YAML source of truth, and is byte-identical across the paired frontend and backend repos.

## Key elements

- **`ROOT`** — Repo root computed via `import.meta.url` (the script runs as ESM under `tsx`).
- **`requiredPath(flag)`** — Reads a required `--flag <value>` from `process.argv`, resolves it against `ROOT`, or prints an error and exits 1.
- **`INPUT` / `OUTPUT`** — The resolved paths for `--in` (YAML source) and `--out` (generated module).
- **`output`** — The full generated-file text, produced by `renderPermissionActions(readPermissionActions(readFileSync(INPUT)))`.
- **Final `writeOrCheck(OUTPUT, output, INPUT)` call** — Writes the file, or under `--check` diffs against the on-disk copy and exits 1 on mismatch without writing.

## Relationships

- **`scripts/contracts/generated-file.ts`** — Provides `writeOrCheck`, the shared write-or-diff-check primitive used by every generator in this directory.
- **`scripts/contracts/permission-actions-render.ts`** — Provides `readPermissionActions` (parses the YAML and extracts the `actions:` list) and `renderPermissionActions` (serialises the result into the generated TypeScript module text).

## Notes

- Byte-identical in both repos of the pair; the only difference between runs is the `--in` path (backend reads `shared/authorization-keys.yaml`, frontend reads `contracts/authorization-keys.yaml`).
- `--check` mode performs a read-only comparison; it is the standard CI guard for all generators in this directory.
- The script is invoked via `tsx` (shebang `#!/usr/bin/env tsx`), so `__dirname` is unavailable — `import.meta.url` is used instead.
- Usage contract: `tsx scripts/contracts/generate-permission-actions.ts --in <yaml> --out <path> [--check]`.
