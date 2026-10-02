---
source: docs/.vitepress/config.mts
sha256: 5059c4583796f1aa6d18c255d198dc28e3ee19d34bc4069f7c2c844e6f589cef
generated_at: 2026-10-02T11:22:56.913540+00:00
model: ollama:qwen3.8:27b
---

# docs/.vitepress/config.mts

## Purpose

VitePress configuration file for the project's documentation site. It defines the site title, navigation, sidebar structure, local search, Mermaid diagram styling, and social links that render the `docs/` directory as a browsable website.

## Key elements

- **`withMermaid(defineConfig(...))`** — Wraps the standard VitePress config to enable Mermaid diagram rendering (from `vitepress-plugin-mermaid`).
- **`title` / `description`** — Sets the site name to "Boilerplate Vue Frontend" and a one-line description.
- **`themeConfig.search`** — Enables VitePress's built-in local search (no external provider).
- **`themeConfig.nav`** — Top-level navigation bar with 7 entries: Home, Getting Started, Theory, Modules, Tools, API, Files.
- **`themeConfig.sidebar`** — Per-section sidebar trees for `/theory/`, `/modules/`, `/tools/`, `/reference/`, and `/api/`. Each tree uses collapsible groups (`collapsed: false`) with nested items (e.g. `cart → checkout flow`, `locales → Runtime overrides`).
- **`themeConfig.socialLinks`** — Single GitHub link to `Guebbit/boilerplate-vue-frontend`.
- **`mermaid`** — Plugin options: `neutral` theme, `useMaxWidth`, `htmlLabels`, flowchart spacing overrides, and a custom `themeVariables` palette (purple/blue/cyan accent colors on light backgrounds).

## Relationships

No dependency-graph neighbors are recorded for this file. It is a leaf configuration consumed by the VitePress build tooling.

## Notes

- Adding a new doc page requires registering its link in the appropriate `sidebar` entry; the page will 404 in the sidebar otherwise (though direct URL access still works).
- Sidebar groups use `collapsed: false` — items are expanded by default on first load.
- The Mermaid `themeVariables` override VitePress's default diagram colors; change them here if the docs theme shifts.
- The `withMermaid` wrapper is the **outermost** call; any new plugin wrapper must be composed around or inside it depending on plugin requirements.
