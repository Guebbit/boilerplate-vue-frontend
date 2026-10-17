---
source: tests/cross-cutting/sitemap-document.spec.ts
sha256: 20d7c59d92e3fd6d03cb003289c03008e4d40d8eec8d8aa41bf75e8abae84d20
generated_at: 2026-10-17T02:02:46.838349+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/sitemap-document.spec.ts

## Purpose

Serves as both the **test** and the **generator** for the route table embedded in `docs/theory/sitemap.md`. It asserts that the markdown table between the `<!-- sitemap:start -->` / `<!-- sitemap:end -->` markers exactly matches the routes contributed by `enabledModules`, and (when `UPDATE_SITEMAP=1` is set) rewrites that block in place. It lives as a spec rather than a script because the route records lazy-load `.vue` views through `@/` aliases, which only the Vitest/Vite pipeline can resolve.

## Key elements

- **`viewOf(route)`** — Extracts the `views/<File>.vue` path from a lazy-loaded `route.component` by inspecting its source string; returns `'—'` for routeless components.
- **`pageLinkOf(moduleName)`** — Returns the relative link target for a module's documentation page, falling back to a section anchor in `modules.md` for the `example` module.
- **`cellsOf(moduleName, route)`** — Builds one table row as an array of six cells (Module, Path, Route name, Access, Permission, View).
- **`expectedRows()`** — Flattens all enabled modules' routes into an ordered array of cell arrays.
- **`expectedBlock()`** — Assembles the full generated Markdown block (header, separator, rows, trailing count sentence).
- **`currentBlock(text)`** — Extracts the block currently held between the markers, or returns `undefined` if markers are absent.
- **`normalised(block)`** — Reduces a Markdown table block to comparable data (trimmed cell arrays + count sentence), stripping the separator row and Prettier padding.
- **`describe('docs/theory/sitemap.md')`** — Two tests: (1) asserts the page's block equals the expected block, or rewrites it under `UPDATE_SITEMAP=1`; (2) sanity-checks that at least one row exists.
- **Constants `PAGE`, `START`, `END`** — Resolve the target file path and the HTML-comment markers delimiting the generated region.

## Relationships

- **`tests/unit/app/guards/authentications.spec.ts`** (graph neighbor) — Listed as a dependency-graph peer, but no direct import, export, or symbol reference between the two files is visible in this file's source. They likely share the `@/modules` route records and access metadata they each assert against.

## Notes

- **Row comparison is structural, not textual.** Cells are compared as trimmed string arrays, so Prettier's column-padding changes to the Markdown never cause a spurious failure.
- **Regeneration workflow:** `UPDATE_SITEMAP=1 npx vitest run tests/cross-cutting/sitemap-document.spec.ts` then `npx prettier --write docs/theory/sitemap.md`. Forgetting the Prettier step leaves the table unpadded.
- **`viewOf` is fragile by design:** it relies on Vite rewriting `import()` calls so that the resolved `.vue` path is visible in the function's source. If the build pipeline changes how it inlines dynamic imports, this regex will stop matching and every view cell will read `'—'`.
- **The `example` module** is special-cased in `pageLinkOf`: it has no dedicated `.md` file, so its link points to a section anchor in `modules.md`.
- **The "is checking a real population" test** is a guard against a vacuous pass — if `enabledModules` ever resolves to an empty array, the table assertion would trivially succeed with zero rows.
