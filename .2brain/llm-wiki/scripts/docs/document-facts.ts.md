---
source: scripts/docs/document-facts.ts
sha256: 0666ff2e32d7ef54b4699cbfaec171fff151ac3bd002a181c460ad1d22ce7dae
generated_at: 2026-10-02T11:32:53.437162+00:00
model: ollama:qwen3.8:27b
---

# scripts/docs/document-facts.ts

## Purpose

Pure text-level fact checks that verify what documentation pages claim about `package.json` scripts, dependencies, and the generated `@api` / `@api/schemas` contract. The file is deliberately I/O-free (no git tree, no file reads) so that every rule is a plain function a unit spec can drive with a string fixture.

## Key elements

- **`DocumentPage`** / **`PackageFacts`** / **`FactFinding`** — small interfaces that define the input shape (a page's path + markdown) and the output shape (page + one-line problem) for every check.
- **`npmScriptsCited(text)`** — extracts distinct `npm run <name>` script names from a page via regex.
- **`missingScripts(pages, known)`** — reports every cited script absent from the `known` set (this repo + peer backend).
- **`codeSpans(text)`** *(private)* — splits every backticked token on `,` / `/` delimiters into a `Set`.
- **`unnamedOn(page, names, noun)`** — reports names that must appear as code spans on a page but do not.
- **`listedPackages(text)`** — reads the second cell of Markdown table rows only, returning package-looking code spans.
- **`staleListings(page, installed)`** — reports packages listed on the dependencies page that are not in `installed`.
- **`fencedContractImports(text)`** — parses `import { … } from '@api'` / `'@api/schemas'` inside code fences, stripping `type` markers and `as` aliases.
- **`unknownContractImports(pages, exportsOf)`** — reports imported names the contract does not export.
- **`exportedNames(source)`** — regex-extracts top-level `export const|function|type|interface|enum|class Name` identifiers from a generated (orval) TypeScript file.

## Relationships

- **`scripts/docs/check-references.ts`** — The orchestrator. It supplies the page texts, `PackageFacts`, and contract export sets, then calls the functions exported here and aggregates their `FactFinding[]` results into a single report. This module never reads files or the git tree; `check-references.ts` does.
- **`tests/unit/scripts/document-facts.spec.ts`** — Unit spec that drives each exported function with inline Markdown and `package.json` fixtures, asserting the expected `FactFinding` arrays.

## Notes

- `codeSpans` is intentionally **not** exported; it is an internal helper used only by `unnamedOn`.
- `listedPackages` reads **only the second table cell** (index 2 after splitting on `|`), so prose or code spans elsewhere on the page cannot satisfy the check.
- `fencedContractImports` handles multi-name imports, inline `type` qualifiers, and `as` aliases in a single pass; it returns `{ from, name }` pairs.
- `exportedNames` relies on orval emitting every export at column zero with a plain `export <kind> Name` form; it will miss re-exports or computed export syntax.
- The module doc lists four check categories (scripts, dependency listings, contract imports) but the actual functions split category 2 into both directions (`unnamedOn` for "defined but not listed" and `staleListings` for "listed but not installed").
