---
source: scripts/contracts/generate-error-codes.ts
sha256: 1740c0b2a56375cc68df39bfd6f912a7d67099e98df03eba0c62307caf542d5f
generated_at: 2026-10-02T11:28:09.322445+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-error-codes.ts

## Purpose
Generates a TypeScript constants object (`ERROR_CODES`) and a derived union type (`ErrorCode`) from the `x-error-codes` extension in `openapi.yaml`. It exists so call sites can reference `ERROR_CODES.CART_EMPTY` instead of retyping strings, while keeping the wire contract's `errors[].code` as an open `string` (no `enum`), per CT-D5 / Zalando API guideline #112.

## Key elements
- **`ErrorCodeEntry`** — interface describing one entry in `x-error-codes` (`status`, `description`).
- **`OpenApiDocument`** — minimal typed view of `openapi.yaml`, keyed on `'x-error-codes'`.
- **`ROOT` / `INPUT`** — resolve the repo root and the path to `openapi.yaml` (ESM via `import.meta.url`).
- **`resolveOutputPath()`** — reads the required `--out <path>` CLI flag; exits 1 if missing.
- **`checkOnly`** — boolean set when `--check` is present; switches from write to compare-and-report.
- **`renderRow(code)`** — emits one JSDoc-annotated property line (`/** 400 — … */` + `"CODE": "CODE"`) using the entry's `status` and `description`.
- **Main block** — parses YAML, sorts code keys (`.toSorted()`), concatenates rows into the full output string, then either writes the file or compares it (exit 1 on drift, printing the regenerate command).

## Relationships
No graph neighbors are recorded. The script reads `openapi.yaml` (a data file, not a code dependency) and writes a standalone `error-codes.ts` that other modules import; it has no imports from project source files.

## Notes
- **Shared script, byte-identical across the two-repo pair.** Both repos write `error-codes.ts` beside their generated contract types from the *same* `openapi.yaml` input.
- **Deliberately a `const` object, not `z.enum`.** The contract keeps `code: string` so adding a code is additive, never a breaking response change. The generated type is open-ended; nothing here rejects an unknown code at runtime.
- **ESM-only.** Runs under `tsx`; uses `import.meta.url` / `fileURLToPath` instead of `__dirname`.
- **`--check` contract.** Writes nothing, exits 1 on any byte mismatch. Same convention as every other generator in the `scripts/contracts/` family.
- **`Object.hasOwn` guard in `renderRow`.** Defensive against prototype keys leaking through `Object.keys`; mirrors the same pattern in `generate-asyncapi-types.ts`.
- Generated output carries a `DO NOT EDIT` banner and a `npm run gen:api` regenerate hint.
