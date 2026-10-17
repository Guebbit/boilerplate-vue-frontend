---
source: tests/unit/scripts/document-facts.spec.ts
sha256: 727b63a04cf3d0f64378459f8c6490db940e4901971ec669ace90e3320d51e43
generated_at: 2026-10-17T02:41:55.438888+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/document-facts.spec.ts

## Purpose

Unit-test suite for the pure extraction and validation helpers in `scripts/docs/document-facts.ts`. Every rule is exercised against small inline fixture strings rather than the real file tree, so a parsing or matching regression fails here immediately instead of silently passing against docs the code can no longer read.

## Key elements

- **`npmScriptsCited` / `missingScripts`** — verifies that script names are pulled from prose spans, inline code, and fenced blocks (dropping `--` argument lists), and that `missingScripts` flags only scripts absent from the provided `Set`.
- **`unnamedOn`** — confirms that a table cell like `` `lint` / `lint:fix` `` is counted as two names, and that a name present in the supplied list but absent from the page is reported.
- **`listedPackages` / `staleListings`** — checks that only package-shaped spans in the "Packages" table cell are collected (prose mentions in other cells are ignored), and that `staleListings` reports a listed package not in the installed set.
- **`fencedContractImports` / `unknownContractImports`** — validates that only imports inside a fenced code block are parsed, that `type` markers and `as` aliases are stripped, and that a binding the contract does not export is flagged with the correct module path.
- **`exportedNames`** — asserts the generator yields top-level `export interface`, `export type`, and `export const` bindings (including `as const` enums) while skipping indented/nested exports.

## Relationships

- **`scripts/docs/document-facts.ts`** (sole dependency) — this spec imports every public function from that module. There is no other interaction; the test file adds no runtime behaviour of its own beyond the Vitest assertions.

## Notes

- `exportedNames` is a **generator** (consumed via `[...exportedNames(source)]`); the other helpers return plain arrays or arrays of `{ page, problem }` objects.
- All fixtures are hand-written strings; the suite never reads from `docs/` or `node_modules`. If the shape of a real doc changes in a way the fixtures don't cover, the test will still pass — the fixtures are the contract, not a snapshot of live files.
- The file sits three levels deep (`tests/unit/scripts/…`) to mirror the `scripts/docs/` target, keeping the relative import shallow.
