---
source: scripts/contracts/generate-permission-actions.ts
sha256: b62e96e604bd5fcd61e8f6791efe6150503aaac699dc868e53147ca75b03f3ee
generated_at: 2026-10-02T11:28:46.943896+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-permission-actions.ts

## Purpose

CLI script (run via `tsx`) that reads the `actions:` block from an `authorization-keys.yaml` file and generates a TypeScript module containing both a runtime array and a derived union type of permission actions. It exists so that frontend and backend repos can produce identical permission-action type definitions from a shared YAML source, keeping the vocabulary in sync.

## Key elements

- **`requiredPath(flag)`** – Parses a `--flag <value>` pair from `process.argv`, resolves the value to an absolute path relative to the repo root, or exits with an error if missing.
- **`INPUT` / `OUTPUT`** – Module-level constants resolved via `requiredPath('--in')` and `requiredPath('--out')`.
- **`checkOnly`** – Boolean flag (`--check`) that switches the script into a compare-and-report mode instead of writing.
- **Main flow** – Reads the YAML, calls `readPermissionActions` → `renderPermissionActions`, then either writes the result to `OUTPUT` or (in `--check` mode) diffs against the existing file and exits 1 on mismatch.

## Relationships

- **`scripts/contracts/permission-actions-render.ts`** – Imports `readPermissionActions` (parses the YAML text into an action list) and `renderPermissionActions` (serializes the list into the generated TypeScript source). All YAML parsing and code-generation logic lives in that neighbor; this file is purely the CLI orchestration layer.

## Notes

- **Byte-identical across repos.** The same file ships in both the backend and frontend repos. The backend points `--in` at `shared/authorization-keys.yaml`; the frontend points at the copy synced into `contracts/authorization-keys.yaml`. The generated output path differs per repo but the script content must stay identical.
- **`--check` is the CI contract.** All generator scripts in this directory follow the same pattern: with `--check`, write nothing, exit 1 on drift, and suggest `npm run gen:api` as the fix.
- **ESM context.** The script uses `import.meta.url` (not `__dirname`) to compute `ROOT`; it must be invoked through a `tsx` loader that supports ESM.
- **No YAML parser imported here.** Parsing is delegated entirely to `permission-actions-render`; this file only handles I/O and CLI concerns.
