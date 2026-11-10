---
source: scripts/docs/document-facts.ts
sha256: e9d28e7f13f1c2f392ea76ef83c47da5b6866122ac63fa6b44f92260ca39d006
signature: ac548034e78f74a70dc4baae0e90f96594c700a8e9c6704405b18d48e70a2230
generated_at: 2026-11-10T02:30:32.598560+00:00
model: ollama:qwen3.8:27b
---

# scripts/docs/document-facts.ts

## Purpose

Pure text-based fact checks for documentation pages. Each exported function takes a page's markdown (and a set of known names) and reports claims that do not hold — without touching the filesystem or git tree. This separation keeps every rule a plain, fixture-drivable function, distinct from the file-path sweep in `check-references.ts`.

## Key elements

- **`DocumentPage`** / **`PackageFacts`** / **`FactFinding`** — input/output shapes shared by all checks.
- **`npmScriptsCited(text)`** — extracts distinct `npm run <name>` citations (inline or fenced) from a page.
- **`missingScripts(pages, known)`** — flags cited script names absent from the `known` set (which covers both frontend and backend repos).
- **`listedPackages(text)`** — reads package names from the "Packages" column of a markdown dependency table (second cell, backtick spans only).
- **`staleListings(page, installed)`** — flags listed packages not present in the installed dependency set.
- **`fencedContractImports(text)`** — extracts `{ from, name }` pairs for named imports from `@api` / `@api/schemas` inside code fences; strips `type` markers and `as` aliases.
- **`unknownContractImports(pages, exportsOf)`** — flags imported names that the corresponding contract does not export.
- **`exportedNames(source)`** — reads exported symbol names from a generated (orval) TypeScript file via a column-zero `export <kind> Name` pattern.

## Relationships

- **`scripts/docs/check-references.ts`** — The orchestrator. It loads pages, assembles the `known` script set, the installed dependency set, and the contract export map, then calls the functions above and aggregates the resulting `FactFinding[]` into its report.
- **`tests/unit/scripts/document-facts.spec.ts`** — Unit spec that drives each pure function with fixture text and expected `FactFinding` output.

## Notes

- `listedPackages` intentionally reads only the **second table cell** and only backtick spans, so prose elsewhere on the page cannot be mistaken for a listing.
- `npmScriptsCited` accepts `[\w.:-]+` in the name (dots, hyphens, colons) and deduplicates; a trailing `--` argument list is not part of the captured name.
- `exportedNames` relies on orval's output convention (top-level `export <kind> Name` at column zero). It will miss barrel re-exports (`export * from …`) or non-conforming formats.
- `fencedContractImports` matches single-quoted specifiers (`'@api'` / `'@api/schemas'`); double-quoted imports in fences will not be caught.
