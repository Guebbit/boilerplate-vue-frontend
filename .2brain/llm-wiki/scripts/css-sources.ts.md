---
source: scripts/css-sources.ts
sha256: c1162504b5e389de36f098d40c84901eb5958c5f92ce47c9b119cde121f56aa6
signature: c9a1c825d8979e156605f881e607c1f7ad090054b1b9c7f7f520255e30f32d3a
generated_at: 2026-11-10T02:28:19.427277+00:00
model: ollama:qwen3.8:27b
---

# scripts/css-sources.ts

## Purpose

Collects every piece of CSS the app ships with—`main.css`, all SFC `<style>` blocks, and the splash `<style>` in `index.html`—into a uniform `CssSource[]` shape. Each entry records the line on which its CSS begins so that PostCSS node positions can be mapped back to the original file. This module exists as the single data-gathering layer for the stylesheet specs and the CSS-invasiveness audit.

## Key elements

- **`ROOT`** — `process.cwd()`; all paths in this module are resolved against it.
- **`MAIN_CSS`** — constant path (`src/styles/main.css`) for the app's one global stylesheet.
- **`CssSource`** (interface) — a CSS chunk with `file`, `css` text, `firstLine`, `scoped`, and `sfc` flags.
- **`vueFiles(directory)`** — recursively lists `.vue` files under a directory, skipping any `tests/` subdirectory.
- **`readRoot(file)`** — `readFileSync` wrapper that resolves paths relative to the repo root.
- **`sfcStyles(file)`** *(private)* — uses `vue/compiler-sfc` to parse one SFC and return one `CssSource` per `<style>` block.
- **`cssSources()`** — main public entry: returns `main.css` first, then every SFC style block.
- **`documentCssSources()`** — extracts inline `<style>` blocks from `index.html` via regex.
- **`insideTheme(node)`** — walks a PostCSS node's parent chain to determine whether it sits inside an `@theme` / `@theme inline` at-rule.

## Relationships

- **`scripts/audit/css-invasive/scan.ts`** — consumes `cssSources()` (and likely `documentCssSources()`) to obtain the CSS it audits, and uses `insideTheme` to exclude theme-block contents.
- **`scripts/tailwind-build.ts`** — references `MAIN_CSS` as the Tailwind entry point it compiles.
- **`tests/cross-cutting/css-invasiveness.spec.ts`** — calls `cssSources()` / `documentCssSources()` to feed assertions about invasive selectors.
- **`tests/cross-cutting/design-tokens.spec.ts`** — uses `cssSources()` and `insideTheme` to verify token declarations live inside `@theme` blocks.
- **`tests/cross-cutting/utility-collisions.spec.ts`** — consumes the collected sources to detect overlapping utility classes.

## Notes

- Scripts and specs **must run from the repo root**; `ROOT` is simply `process.cwd()`.
- `firstLine` is 1-based and points at the first line of the CSS *as it appears in the file*, not the first line of the file itself. For SFC blocks this is the line after `<style …>`.
- `documentCssSources` uses a non-greedy regex rather than a DOM parser; it will not handle nested or malformed `<style>` tags.
- `vueFiles` silently skips any directory named `tests` at any depth, so spec fixtures are never collected.
- `sfcStyles` is intentionally non-exported; callers should go through `cssSources()` for uniform ordering.
