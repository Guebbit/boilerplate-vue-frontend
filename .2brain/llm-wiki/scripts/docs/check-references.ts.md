---
source: scripts/docs/check-references.ts
sha256: d596602952bd4f52c1960ad74b9d614a779ebb07fe5341e0ed9848baddea7cd5
signature: 084bacdadd0b9263a800fb576787fc4344c7281d31b78a52fcbc67fd8ddd3a34
generated_at: 2026-11-10T02:30:21.021452+00:00
model: ollama:qwen3.8:27b
---

# scripts/docs/check-references.ts

## Purpose

Validates that every file path **claimed** in inline code spans across the VitePress docs actually exists in the repo (or the paired backend repo). Catches the "dead fact" class of rot that `docs:build`'s dead-link check does not cover: a page citing a file that was renamed, merged, or deleted. Runs as a step of `npm run check`.

## Key elements

- **`trackedTargets(root)`** — Builds a `Set<string>` of every path-tail (and intermediate directory tail) git tracks in a given repo, enabling O(1) suffix lookup instead of repeated `endsWith` scans.
- **`readAliases()`** — Reads `tsconfig.app.json` (strips JSONC comments first) and returns the `@/` → `src/`-style alias table, so `@/x` tokens are checked against the real path.
- **`slugify` / `headingSlugs(markdown)`** — Replicates VitePress's heading-slug algorithm (lowercase, strip markdown emphasis, spaces → hyphens) and collects all `{#custom-id}` overrides. Used to validate the `#anchor` half of a path+anchor claim.
- **`anchorPageFor(pages)`** — Maps every tail of every tracked page path back to the full page, so an anchor lookup can go from a doc's spelling directly to the page whose headings settle it.
- **`allowed(token)`** — Checks the token against the `ALLOWED` exemption list (prefix match, plus the parent directory of an exempt prefix).
- **`gitEnvironmentWithoutHookVariables()`** — Clones `process.env` minus `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` so a nested `git ls-files` against the peer repo doesn't silently answer for a parent hook's repo.
- **`FILENAME` / `NOT_A_PATH`** — Regex gates: a token must end in a recognised extension and contain no characters typical of prose, globs, or type annotations to be treated as a path claim.
- **`ALLOWED`** — Documented exemption list (report artefacts, `node_modules/`, `dist/`, build outputs, `.env`, etc.). Each entry carries a human-readable `reason`.
- **`MIN_PAGES` (65) / `MIN_REFERENCES` (200)`** — Floor guards: if the sweep sees fewer pages or references than these values, it fails, preventing a silently-broken sweep from reporting a clean tree.
- **`IGNORE_LINE`** — The string `<!-- doc-paths:ignore -->`; a line carrying it is skipped entirely (used for rename tables, merge-rationale prose, etc.).

## Relationships

- **`github/workflows/ci.yml`** — Invokes this script (via `npm run check`) on every CI run; a non-zero exit blocks the pipeline.
- **`scripts/docs/document-facts.ts`** — Supplies the higher-level fact-checking utilities this script composes: `exportedNames`, `missingScripts`, `staleListings`, `unknownContractImports`, and the `DocumentPage` / `FactFinding` types.
- **`scripts/pairing/paired-backend-path.ts`** — Provides `DEFAULT_BACKEND_PATH` (the peer repo's directory) and `resolveBackendPath()`; used here to address the paired backend so tokens that reference it are validated against *its* tree rather than this repo's.

## Notes

- **Mirrored, not generated.** A structurally similar file exists in the paired backend. Each repo reads its own tree, its own aliases, and its own peer. Neither is generated from the other; they must be kept in sync by hand.
- **Suffix resolution.** `stores/cart.ts` matches `src/modules/cart/stores/cart.ts`. Docs pages do not need to spell full root-relative paths.
- **Fenced blocks are excluded.** Only inline `` `code` `` spans are swept; fenced blocks are treated as illustrative samples.
- **`@`-prefixed tokens** are resolved through the tsconfig alias table; anything that matches no alias (e.g. `@vueuse/core`) is treated as an npm package and skipped.
- **Floor values are ratchets.** Raise `MIN_PAGES` / `MIN_REFERENCES` as docs grow; never lower them to make a failing run pass.
- **ESM / `tsx`.** The script uses `import.meta.url` (no `__dirname`) and a `#!/usr/bin/env tsx` shebang.
- **`<!-- doc-paths:ignore -->`** is the only opt-out. It is a visible, greppable marker — the script deliberately has no blanket "ignore this page" escape hatch.
