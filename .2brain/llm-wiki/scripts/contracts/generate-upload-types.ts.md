---
source: scripts/contracts/generate-upload-types.ts
sha256: 593cffc410475e0e05f4901306dd3080204b886520d8719c27ce99dd4b2a9397
signature: 5046a1f0f142afa1beea7f116c72405eaeb2918c71c13d5bc964d4651bc859dc
generated_at: 2026-11-10T02:25:57.039454+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-upload-types.ts

## Purpose

Reads `openapi.yaml`, extracts the single `encoding.imageUpload.contentType` value declared across all multipart `imageUpload` parts, and generates a TypeScript module exporting that list as a typed constant. This ensures the backend file filter and the frontend file picker both consume one authoritative source rather than duplicating the list.

## Key elements

- **`MediaType` / `OpenApiDocument`** — Narrow interfaces describing only the OpenAPI slices this script reads (the `encoding.imageUpload.contentType` field under `multipart/form-data` request bodies).
- **`resolveOutputPath()`** — Parses the required `--out <path>` CLI argument and resolves it against the repo root; exits with an error if missing.
- **`declared` (Map)** — Collects every distinct `contentType` string found across all route/method combinations, recording which operations name it.
- **Validation block** — Exits non-zero if zero or more than one distinct `contentType` is found, printing the offending values and their locations.
- **`types`** — The comma-separated `contentType` split into a trimmed string array.
- **`output`** — The full text of the generated `.ts` file: an `ACCEPTED_UPLOAD_TYPES` const array (`as const`) and an `AcceptedUploadType` union type derived from it.
- **`writeOrCheck(OUTPUT, output, …)`** — Writes the file, or under `--check` compares against disk and exits 1 on mismatch.

## Relationships

- **`scripts/contracts/generated-file.ts`** — Provides the `writeOrCheck` helper. This script calls it with the resolved output path and the generated text; `writeOrCheck` handles both the write path and the `--check` diff-and-exit path.

## Notes

- Runs as **ESM** (`#!/usr/bin/env tsx`); uses `import.meta.url` to locate the repo root, not `__dirname`.
- The backend keeps its **own copy** of this same script that writes `api/upload-types.ts`; both copies consume the identical `openapi.yaml` (it travels to the frontend as a shared file).
- The generated output carries a `DO NOT EDIT` header and the `npm run gen:api` regenerate hint.
- `--check` mode writes nothing; it is the shared CI/commit-hook entry point for detecting stale generated files.
