---
source: scripts/contracts/generate-error-codes.ts
sha256: 50510998439f1a2dc0a61714e97f537abb99c7e35dea46117b161e42c5af01f8
signature: 7b0c7621176b0a92bd8d416d5cdf583404b582d43807dc32b1cfd2defc86656f
generated_at: 2026-11-10T02:24:26.235783+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-error-codes.ts

## Purpose

Generates a TypeScript error-code catalogue (`ERROR_CODES` constant + `ErrorCode` union type) from the `x-error-codes` extension in `openapi.yaml`. It exists so call sites can reference named constants instead of retyping string literals, while the contract itself keeps `errors[].code` as an open `string` (Zalando guideline #112) so adding a code is never a breaking change.

## Key elements

- **`resolveOutputPath()`** – Reads the required `--out <path>` CLI argument; exits with an error if missing.
- **`renderRow(code)`** – Emits one JSDoc-annotated property line (`/** 400 — … */ "CODE": "CODE",`) for a single error code.
- **`document`** – Parsed YAML of `openapi.yaml`, narrowed to the `OpenApiDocument` slice (just `x-error-codes`).
- **`codes`** – Sorted array of declared code names (`toSorted()`), ensuring stable output ordering across runs.
- **`output`** – The full generated file text: a header banner, the `ERROR_CODES` `as const` object, and the `ErrorCode` union type.
- **`writeOrCheck(OUTPUT, output, 'openapi.yaml')`** – Either writes the file or (with `--check`) diffs against disk and exits 1 on mismatch.
- **`ErrorCodeEntry` / `OpenApiDocument`** – Local interfaces describing the shape of the `x-error-codes` data.

## Relationships

- **`scripts/contracts/generated-file.ts`** – Provides `writeOrCheck`, the shared write-or-verify helper this script calls at the end. No other code is imported from that file.

## Notes

- **Open by design:** `ErrorCode` is a union of *known* codes but is **not** exhaustive at the type level. The contract deliberately omits an `enum`, so a new code on the wire is additive, not a breaking response change. Nothing in the generated file rejects an unknown code.
- **Byte-identical across repos:** This script is shared (identical copy) in both repos of the pair; both consume the same `openapi.yaml`.
- **ESM:** Uses `import.meta.url` (not `__dirname`) because it runs as an ES module under `tsx`.
- **`--check` contract:** Writes nothing; exits 1 if the on-disk file differs. Same contract as every other generator in this `scripts/contracts/` family.
- **`Object.hasOwn` guard** in `renderRow` mirrors a convention in the sibling `generate-asyncapi-types.ts`; it is defensive even though `codes` comes from `Object.keys`.
