---
source: tests/unit/scripts/document-facts.spec.ts
sha256: 71f7f7ab94a7c1fe9c9e9601747605e7ebc8b85ed54fdf7647068abbabe0b19c
signature: 71f7f7ab94a7c1fe9c9e9601747605e7ebc8b85ed54fdf7647068abbabe0b19c
generated_at: 2026-11-10T08:14:28.538865+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/document-facts.spec.ts

## Purpose

Unit tests for the pure parsing functions in `scripts/docs/document-facts.ts` (the "pure half" of the docs-reference check). Each rule is exercised against a small inline fixture rather than a real tree, so a rule that stops recognizing the construct it targets fails here instead of silently passing a page it can no longer read.

## Key elements

- **`npmScriptsCited` / `missingScripts`** — Verify script-name extraction from prose, inline `` `npm run …` `` spans, and fenced shells (including stripping of argument lists like `-- src/x`), and that only scripts absent from the known set are flagged.
- **`listedPackages` / `staleListings`** — Verify that only package-shaped backtick spans inside the *Packages* table cell are extracted, and that a listed-but-uninstalled package produces exactly one finding.
- **`fencedContractImports` / `unknownContractImports`** — Verify that import bindings are read only from fenced `ts` blocks (prose mentions ignored), `type` markers and aliases are dropped, and a name not in the contract's export set is reported.
- **`exportedNames`** — Verify top-level export extraction from orval-generated TS: `interface`, `type`, `const`, `as const` enums; indented (nested) exports are excluded.

## Relationships

- **`scripts/docs/document-facts.ts`** — Sole dependency. All seven exported functions under test are imported from it; no other module is referenced.

## Notes

- Tests are entirely fixture-driven (inline strings / page objects); they never touch the filesystem. This is intentional so the test isolates the *parsing* logic from the *collection* logic that lives in the non-pure half of the checker.
- `npmScriptsCited` treats `` `npm run test:unit -- src/x` `` and a fenced `npm run lint:fix` identically — the script name is everything after `run` up to the first ` --` or end-of-line.
- `listedPackages` ignores backtick spans that are not package-shaped (e.g. `` `not-a-package thing` ``); only the "Packages" column is scanned, not "Group" or "Why".
- `fencedContractImports` is fence-aware: an `import { … }` written in prose outside a fence is **not** a finding.
- `exportedNames` skips indented exports (e.g. `    export const nested = 1;`), treating them as non-top-level.
