---
source: scripts/docs/check-references.ts
sha256: cb9864caa60dc08b965a2d95ed446ff43cb8db5b396fee6cfa63d5042db50e1c
generated_at: 2026-10-16T23:59:48.084767+00:00
model: ollama:qwen3.8:27b
---

# scripts/docs/check-references.ts

## Purpose

Validates that every file path cited in an inline code span across the docs actually exists in this repo's tree (or the paired backend's tree). Catches the "dead fact" class of rot that `docs:build` cannot detect: a page naming a file that was renamed, merged, or deleted. Runs as `npm run check:docs-references`.

## Key elements

- **`MIN_PAGES` / `MIN_REFERENCES`** — sentinel floors (65 / 200) that fail the run if the sweep silently sees fewer pages or references than expected, preventing a broken sweep from reporting a clean tree.
- **`ALLOWED`** — prefix-matched list of paths that legitimately do not exist in a clean checkout (build output, test artefacts, `node_modules/`, etc.), each annotated with the reason for the exemption.
- **`FILENAME` / `NOT_A_PATH`** — regexes that qualify or disqualify a token as a real file path (rejects MIME types, lint rules, prose, globs, elided paths).
- **`IGNORE_LINE`** — the `<!-- doc-paths:ignore -->` marker; a line carrying it is skipped whole (used for rename tables, "file was merged away" prose).
- **`slugify` / `headingSlugs`** — reproduce VitePress's heading-slug algorithm and extract all anchors a page answers to, for anchor-resolution checks.
- **`anchorPageFor`** — builds a suffix→page map so an anchor claim can be resolved to the page whose headings settle it.
- **`readAliases`** — parses `tsconfig.app.json` (stripping JSONC comments) to rewrite `@/…` tokens into real paths; tokens matching no alias are treated as npm packages.
- **`gitEnvironmentWithoutHookVariables`** — returns `process.env` with `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE` deleted, so nested `git ls-files` calls resolve against their `cwd`.
- **`trackedTargets`** — runs `git ls-files` in the target repo and precomputes a `Set` of every path tail and intermediate directory for O(1) suffix lookups; also collects root-level entries.
- **`Finding`** — interface for one unresolved claim (`page` + `token`).
- Imports from `./document-facts`: `exportedNames`, `missingScripts`, `staleListings`, `unknownContractImports`, `unnamedOn`, and the `DocumentPage` / `FactFinding` types.
- Imports from `../pairing/paired-backend-path`: `DEFAULT_BACKEND_PATH`, `resolveBackendPath`.

## Relationships

- **`scripts/docs/document-facts.ts`** — supplies the document-parsing and fact-extraction utilities (page enumeration, script-listing checks, contract-import validation, naming checks) that `check-references` consumes to obtain the set of pages and their structured facts.
- **`scripts/pairing/paired-backend-path.ts`** — provides `DEFAULT_BACKEND_PATH` (the canonical location of the paired backend repo) and `resolveBackendPath` (resolves it relative to this repo). `check-references` uses these to know where to `git ls-files` for cross-repo path citations and to derive `PEER_DIRECTORY` for prose matching.

## Notes

- **ESM-only**: the repo root is derived via `fileURLToPath(import.meta.url)`, not `__dirname`.
- **JSONC parsing**: `tsconfig.app.json` contains `//` comments; `readAliases` strips them line-by-line before `JSON.parse`. Keeping a second copy of the alias table is explicitly avoided.
- **Git-hook safety**: if this script runs inside a `pre-commit` hook, inherited `GIT_DIR` / `GIT_WORK_TREE` / `GIT_INDEX_FILE` would silently redirect a nested `git ls-files` to the wrong repo. Always use `gitEnvironmentWithoutHookVariables()` when spawning git.
- **Suffix resolution, not exact path**: `stores/cart.ts` matches `src/modules/cart/stores/cart.ts`. Pages do not need to spell full root-relative paths.
- **Slug approximation**: `slugify` does not replicate VitePress's `-1` / `-2` deduplication for repeated headings, so a genuine anchor collision will *under*-report (miss a finding), never over-report.
- **Floors are ratchets**: raise `MIN_PAGES` / `MIN_REFERENCES` as the docs grow; never lower them to make a failing run pass.
- **Only inline code spans** are swept. Fenced code blocks are treated as illustrative samples and excluded to avoid burying real findings in example imports.
- **`@`-prefixed tokens**: if the `@`-prefix matches a `tsconfig.app.json` alias, it is resolved and checked; otherwise (e.g. `@vueuse/core`) it is read as an npm package and skipped.
- **Peer-repo citations**: a token beginning with the paired repo's directory name is resolved against *that* repo's tracked files. Citing the peer by its package name instead of its directory name produces a finding.
