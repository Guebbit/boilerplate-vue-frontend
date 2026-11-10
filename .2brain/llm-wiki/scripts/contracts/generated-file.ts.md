---
source: scripts/contracts/generated-file.ts
sha256: acb2cf6cd35a2bb9f1bd47cc58da6c516e96f67de343f2aecd44f4f2c8e21e01
signature: 5f2057876b42b25e9e8fe9cebaa61ac7f7a96ef36e3bbd59fc491819a3525376
generated_at: 2026-11-10T02:26:06.691376+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generated-file.ts

## Purpose

Shared write-or-verify tail that every contract generator in this folder ends with. It centralises the "write the file" vs. "compare and fail" logic so generators stay focused on producing content. The file is kept **byte-identical across both repos** in the pair.

## Key elements

- **`writeOrCheck(output, text, label, fixCommand?)`** — the sole export.
  - Without `--check` on the CLI: creates parent directories (if needed), writes `text` to `output`, logs a success line.
  - With `--check`: reads `output` from disk, compares byte-for-byte to `text`. On match, logs a "current" message; on mismatch (or missing file), prints the `fixCommand` to regenerate and sets `process.exitCode = 1`.
  - `fixCommand` defaults to `'npm run gen:api'`; callers pass a specific command when the regeneration entry-point differs.

## Relationships

- **`scripts/contracts/generate-error-codes.ts`** — imports `writeOrCheck` as its final step to persist the generated error-code file.
- **`scripts/contracts/generate-permission-vocabulary.ts`** — imports `writeOrCheck` to persist the permission-vocabulary output.
- **`scripts/contracts/generate-shared-rules.ts`** — imports `writeOrCheck` to persist the shared-rules output.
- **`scripts/contracts/generate-upload-types.ts`** — imports `writeOrCheck` to persist the upload-types output.

Each generator builds its `text` string and delegates all file I/O and `--check` logic to this module.

## Notes

- **Repo-pair sync contract:** the file must remain byte-identical in both repos. Any edit here must be mirrored exactly.
- **`--check` is a global CLI flag**, read from `process.argv`; it is not a parameter of `writeOrCheck`. All generators share the same flag.
- Uses `process.exitCode = 1` (not `process.exit`) deliberately so the `console.error` message flushes before the process exits.
- `mkdirSync(..., { recursive: true })` guards against the case where the generator runs before Orval has created the target `api/` directory.
