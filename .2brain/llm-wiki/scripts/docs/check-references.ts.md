---
source: scripts/docs/check-references.ts
sha256: b0936d24ba52eb3b6d3ae1dc3991ab43c928f8e77ff5f3973da0ea2848d03743
generated_at: 2026-10-02T11:32:28.892122+00:00
model: ollama:qwen3.8:27b
---

# scripts/docs/check-references.ts

## Purpose

Validates that every file path cited in inline code spans across the docs actually exists in the repository tree (or the paired backend tree). `docs:build` catches dead *links* between pages; this script catches dead *facts*—a page that lists `models/serialize.ts` as a current property-tested surface. Run via `npm run check:docs-references`.

## Key elements

- **`MIN_PAGES` / `MIN_REFERENCES`** (65 / 200) — Floor thresholds. A sweep that reads zero pages must fail, not report clean. Raise as docs grow; never lower to pass a run.
- **`ALLOWED`** — Prefix-matched list of paths that legitimately are absent in a clean checkout (build outputs, reports, `node_modules/`, Cypress artefacts, `.env`). Each entry carries a reason string.
- **`FILENAME` / `NOT_A_PATH`** — Regexes that qualify or disqualify a code-span token as a real file path (rejects MIME types, lint rules, globs, prose).
- **`IGNORE_LINE`** (`<!-- doc-paths:ignore -->`) — Per-line opt-out for prose that intentionally names an absent path (rename tables, merge explanations).
- **`Finding`** interface — A single unresolved claim: `{ page, token }`.
- **`slugify()` / `headingSlugs()`** — Reproduce VitePress heading-slug logic so anchor claims (`page.md#section`) can be verified against the target page's headings.
- **`anchorPageFor()`** — Maps every path-tail to the page it belongs to, enabling anchor resolution.
- **`readAliases()`** — Reads `tsconfig.app.json` `paths` entries (strips JSONC comments) so `@/x` tokens resolve to real files while `@vueuse/core` is treated as an npm package.
- **`gitEnvironmentWithoutHookVariables()`** — Strips `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE` from the environment before a nested `git ls-files` call, preventing hook-time variables from redirecting the query.
- **`trackedTargets(root)`** — Runs `git ls-files` in the given root and builds a `Set` of every path tail (plus every intermediate directory tail) for O(1) suffix lookups.

## Relationships

- **`scripts/docs/document-facts.ts`** — Provides the page-reading infrastructure (`DocumentPage`, `FactFinding`) and fact-checking helpers (`exportedNames`, `missingScripts`, `staleListings`, `unknownContractImports`, `unnamedOn`) that this script composes into its full sweep.
- **`scripts/pairing/paired-backend-path.ts`** — Supplies `DEFAULT_BACKEND_PATH` (used to derive `PEER_DIRECTORY`) and `resolveBackendPath` for resolving tokens that reference the paired backend repo's tree.

## Notes

- Resolution is **suffix-based**: `stores/cart.ts` matches `src/modules/cart/stores/cart.ts` without requiring the full root-relative path.
- Only **inline code spans** are swept. Fenced code blocks are treated as illustrative examples and skipped.
- `./`-relative tokens and `/`-prefixed tokens are excluded (VitePress page-relative paths and SPA routes, respectively).
- A token qualifies as a path only if it ends in a recognized file extension **or** starts with a directory that actually sits at the repo root.
- Tokens beginning with the peer repo's directory name are resolved against the peer tree, not this one.
- The `ALLOWED` list is an *argument* (each entry has a reason), not a blanket mute. A path with no reason to be absent should surface as a finding.
- The `slugify` implementation is intentionally approximate: VitePress de-duplicates repeated headings with `-1`/`-2` suffixes, but this does not, so a genuine collision under-reports rather than over-reports.
- A mirror of this script exists in the paired backend repo. Neither is generated from the other; each reads its own tree, aliases, and peer.
