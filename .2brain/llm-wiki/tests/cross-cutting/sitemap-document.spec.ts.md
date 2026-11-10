---
source: tests/cross-cutting/sitemap-document.spec.ts
sha256: 20d7c59d92e3fd6d03cb003289c03008e4d40d8eec8d8aa41bf75e8abae84d20
signature: c35eb8db05f7fd4d66c3b645819036ba8c647336cd3a01848026b4002b58c898
generated_at: 2026-11-10T06:41:34.970271+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/sitemap-document.spec.ts

## Purpose

A Vitest spec that serves as both the generator and the guard for the route table embedded in `docs/theory/sitemap.md`. It reads the enabled modules' route records, builds the expected Markdown table, and asserts the page's table matches. When `UPDATE_SITEMAP=1` is set, it rewrites the block between the `<!-- sitemap:start -->` / `<!-- sitemap:end -->` markers in-place. It lives as a spec (not a standalone script) because the route records lazy-load `.vue` views through `@/` aliases that only the Vite/Vitest pipeline can resolve.

## Key elements

- **`viewOf(route)`** — Extracts the `views/<File>.vue` path from a route's lazy-loaded component by stringifying the loader and regex-matching the resolved import path; returns `'—'` for routeless components.
- **`pageLinkOf(moduleName)`** — Returns the relative link for a module's table cell: `../modules/<name>.md` if that file exists, otherwise a link to the "adding and deleting a domain" section of `modules.md` (used by the `example` module).
- **`cellsOf(moduleName, route)`** — Produces the six column cells (Module, Path, Route name, Access, Permission, View) for one table row.
- **`expectedRows()`** — Flattens `enabledModules` into an ordered array of cell arrays (module order, then route order).
- **`expectedBlock()`** — Assembles the full Markdown block: header row, separator, data rows, blank line, and a trailing "N screens across M modules" count sentence.
- **`currentBlock(text)`** — Slices the page text between the two marker comments, or returns `undefined` if markers are missing.
- **`normalised(block)`** — Reduces a Markdown table to comparable data: trimmed cell arrays (separator row dropped) plus the count sentence, so column padding from Prettier is irrelevant.
- **`describe('docs/theory/sitemap.md')`** — Two tests: (1) the held block equals the expected block (or the page is rewritten in update mode), (2) the expected row count is non-zero (guards against silently passing with an empty module list).

## Relationships

- **`@/modules` (`enabledModules`)** — The single source of truth for which modules and routes are active. This spec imports it to build the expected table; any change to the module registry is immediately reflected here.
- The graph-listed neighbors (`src/modules/shop-tasks/tests/notices.spec.ts`, `tests/unit/app/guards/authentications.spec.ts`) have no visible direct dependency on or from this file. They may share the `@/modules` registry indirectly, but no import or call edge is present in this file.

## Notes

- **Update workflow:** `UPDATE_SITEMAP=1 npx vitest run tests/cross-cutting/sitemap-document.spec.ts` rewrites the block, then `npx prettier --write docs/theory/sitemap.md` re-aligns columns. Running without the env var asserts equality.
- **Comparison is structural, not textual:** `normalised()` trims cells and drops the `|---|` separator, so Prettier's column-padding changes never cause a false failure.
- **Marker dependency:** If the `<!-- sitemap:start -->` / `<!-- sitemap:end -->` comments are removed from the page, the spec fails with a descriptive message rather than throwing a raw error.
- **View extraction is fragile by design:** It relies on Vite rewriting the dynamic `import()` into a `__vite_ssr_dynamic_import__` call whose argument is the resolved file path. If Vite changes that transformation, `viewOf` will silently return `'—'` for every route.
- **The `example` module** is intentionally linkless; `pageLinkOf` special-cases it via a `existsSync` check rather than a hardcoded name.
