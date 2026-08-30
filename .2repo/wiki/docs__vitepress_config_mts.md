# docs/.vitepress/config.mts

## Purpose

VitePress site configuration for the project documentation. It defines the site metadata, top-level navigation, the full sidebar tree for every doc section, local search, a GitHub social link, and the Mermaid diagram theme used throughout the docs.

## Key elements

- **`withMermaid(defineConfig({...}))`** — wraps the standard VitePress config with the `vitepress-plugin-mermaid` plugin so Mermaid diagrams render in Markdown pages.
- **`title` / `description`** — site-level metadata: "Boilerplate Vue Frontend" and an ADHD-friendly-docs description.
- **`themeConfig.search`** — enables VitePress built-in local search (no external service).
- **`themeConfig.nav`** — top navigation bar: Home, Getting Started, Theory, Modules, Tools, API, Files.
- **`themeConfig.sidebar`** — the complete sidebar structure keyed by section prefix (`/theory/`, `/modules/`, `/tools/`, `/reference/`, `/api/`). Each section defines collapsible groups (`collapsed: false`) and nested items (e.g. cart → checkout flow, admin → dashboard, locales → runtime overrides).
- **`themeConfig.socialLinks`** — a single GitHub icon linking to the upstream repo.
- **`mermaid` block** — renderer options (`theme: 'neutral'`, `useMaxWidth`, `htmlLabels`, flowchart spacing) and a custom `themeVariables` palette (purple/blue/cyan node fills, dark text, slate borders) applied to every diagram in the docs.

## Notes

- The sidebar is **static**: adding a new doc page requires both a Markdown file under `docs/` *and* a matching entry here, or it won't appear in the sidebar.
- Section keys are the URL prefix *with a trailing slash* (e.g. `'/modules/'`). A page at `/modules/cart` is governed by the `'/modules/'` key.
- The `mermaid` block sits at the **root** of the config object (sibling of `themeConfig`), not inside it — this is a convention of `vitepress-plugin-mermaid`.
- No `base` path is set, so the docs are assumed to be served from the domain root.
- Because there are no graph neighbors, this file has no programmatic dependencies beyond the two package imports.
