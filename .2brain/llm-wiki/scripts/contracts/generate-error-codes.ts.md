---
source: scripts/contracts/generate-error-codes.ts
sha256: 50510998439f1a2dc0a61714e97f537abb99c7e35dea46117b161e42c5af01f8
generated_at: 2026-10-16T23:57:34.631630+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-error-codes.ts

## Purpose

Generates a TypeScript `ERROR_CODES` const object and an `ErrorCode` union type from the `x-error-codes` extension in `openapi.yaml`. It exists so call sites can reference error codes as identifiers (with JSDoc on hover) without the contract's `errors[].code` field becoming a closed enum — keeping new codes additive per Zalando API guideline #112.

## Key elements

- **`resolveOutputPath()`** — reads the required `--out <path>` CLI flag and resolves it relative to the repo root; exits with an error if missing.
- **`renderRow(code)`** — renders one `key: value` property line prefixed with a two-line JSDoc comment carrying the code's `status` and `description` from the contract.
- **`ERROR_CODES`** (generated output) — `as const` object mapping each declared code string to itself; the compiler catches typos or removed codes at call sites.
- **`ErrorCode`** (generated output) — `(typeof ERROR_CODES)[keyof typeof ERROR_CODES]` union; explicitly *not* exhaustive at the type level.
- **`ErrorCodeEntry` / `OpenApiDocument`** — local interfaces that narrow the YAML parse result to just the `x-error-codes` slice this generator reads.
- **`writeOrCheck`** (imported) — handles the write-to-disk or `--check` diff-and-exit logic.

## Relationships

- **`scripts/contracts/generated-file.ts`** — provides `writeOrCheck(OUTPUT, output, 'openapi.yaml')`, the shared write-or-`--check` mechanism every generator in this family uses.

## Notes

- Byte-identical across both repos in the pair; the input `x-error-codes` map is collected once in the backend bundler and ships inside the shared `openapi.yaml`.
- Deliberately a plain const object, **not** `z.enum(...)`: the contract keeps `code: string` open-ended, so nothing here rejects an unknown code.
- Codes are sorted with `.toSorted()` to prevent gratuitous diffs between regenerations.
- Runs as ESM (`tsx` shebang, `import.meta.url` + `fileURLToPath`); `__dirname` is unavailable.
- `Object.hasOwn` guard in `renderRow` mirrors the same pattern in `generate-asyncapi-types.ts` — every key in `codes` is guaranteed present, but the guard keeps the type checker honest.
- `--check` writes nothing and exits 1 on a mismatch; identical contract to every other generator in the `scripts/contracts/` family.
