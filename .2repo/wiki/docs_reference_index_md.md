# docs/reference/index.md

## Purpose

A file-level glossary for the repository. When you encounter a filename and need to know what it is, what breaks without it, and where the deeper explanation lives, this page is the one-hop answer. It is explicitly a map, not a theory page — every entry defers conceptual detail to the Theory, Tools, or API sections.

## Key elements

- **Repository flowchart (Mermaid)** — visual tree from repo root down through `src/` subdirectories and the side directories (Contracts, Ops, Dev, Tests). Serves as the orienting diagram for the whole index.
- **Map table** — the nine sub-pages that together cover every tracked directory: `root.md`, `src-app.md`, `src-infrastructure.md`, `src-modules.md`, `src-ui.md`, `contracts.md`, `scripts.md`, `tests.md`, `ops.md`. This table is the single source of truth for "which page owns which path."
- **Entry format spec** — three-column table (`File` / `What it is` / `Read next`) with a hard rule: one or two sentences, present tense, and a link (or `—` for a documented gap).
- **Three-tier classification** — *Named* (unique files get their own row), *Pattern* (repeated shapes get one row plus an inventory), *Excluded* (generated/vendored, stated once per directory). Most of `src/modules/` lives in the Pattern tier.
- **Maintenance guidance** — two `git ls-files` / `grep` one-liners for auditing coverage; the standing convention that a commit adding, moving, or deleting a file must update the page that names it.
- **Mirror note** — section names intentionally match the paired backend repository so a reader can find the same-named page on either side.

## Relationships

- **`docs/reference/contracts.md`** — the Contracts row in the map table links here as the destination for `openapi.yaml`, `asyncapi.yaml`, generated `contracts/`, Orval, and Spectral config.
- **`docs/reference/ops.md`** — the Ops & Assets row links here for `.docker/`, `.github/`, compose files, `public/`, and the docs site.
- **`docs/modules/users.md`** — covered under the Modules row (`src-modules.md`); this index points to that page rather than restating module internals.
- **`docs/modules/wishlist.md`** — same relationship as `users.md`; a per-module page reachable via the Modules entry in the map table.

## Notes

- **No file counts.** Counts are deliberately omitted to avoid staleness; shapes ("one per module") are stated instead. Use `git ls-files` for live numbers.
- **`—` in "Read next"** is a *recorded* documentation gap, not a broken link.
- **Excluded tier is a decision, not an oversight.** Generated output (e.g. `contracts/rest/` written by Orval) is listed once per directory so readers know it was consciously skipped.
- **Git-untracked paths are out by definition** (`dist/`, `node_modules/`, caches, etc.) — they never appear in any entry.
- **Warning to entry authors:** if writing a row reveals the file should not exist, raise it rather than documenting the mistake.
