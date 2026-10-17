---
source: scripts/contracts/generated-file.ts
sha256: acb2cf6cd35a2bb9f1bd47cc58da6c516e96f67de343f2aecd44f4f2c8e21e01
generated_at: 2026-10-16T23:58:17.925263+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generated-file.ts

## Purpose

A single shared utility that every contract generator calls as its final step: write the generated file to disk, or (under `--check`) verify the on-disk copy matches the expected output and fail if it doesn't. Keeping this logic in one place avoids duplicating the write/verify tail across every generator.

## Key elements

- **`writeOrCheck(output, text, label, fixCommand?)`** — The sole export. If `--check` is **not** in `process.argv`, it ensures the target directory exists (`mkdirSync … { recursive: true }`) and writes `text` to `output`. If `--check` **is** present, it compares the existing file byte-for-byte against `text`; on mismatch it prints a remediation hint (naming `fixCommand`, defaulting to `npm run gen:api`) and sets `process.exitCode = 1` without calling `process.exit`, so the error message flushes.

## Relationships

- **`scripts/contracts/generate-error-codes.ts`** — Imports `writeOrCheck` to persist its generated error-code file (or verify it under `--check`).
- **`scripts/contracts/generate-permission-actions.ts`** — Imports `writeOrCheck` to persist its generated permission-actions file (or verify it under `--check`).

## Notes

- The header comment states this file must remain **byte-identical in both repos of the pair**; treat it as a frozen copy, not a local module.
- `--check` is detected by scanning `process.argv` rather than a CLI parser, so any caller that forwards `--check` through `npm run` will trigger verify mode automatically.
- The `mkdirSync` call exists because some generators run *before* the `api/` directory is created by orval; do not assume the parent directory exists.
- `fixCommand` is only surfaced in the error message text; it is never executed programmatically.
