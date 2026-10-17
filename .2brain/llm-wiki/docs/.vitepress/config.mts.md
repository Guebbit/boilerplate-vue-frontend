---
source: docs/.vitepress/config.mts
sha256: af8394005d0060e5fea1e3a38977dad717451774a5cabc4cbbfd7dde7ecc50ab
generated_at: 2026-10-16T23:56:26.214677+00:00
model: ollama:qwen3.8:27b
---

# docs/.vitepress/config.mts

## Purpose

VitePress site configuration that defines the documentation site's identity, navigation structure, sidebar hierarchy, and Mermaid diagram styling. It exists as the single source of truth for how the project's docs are presented, so adding a new page or section only requires editing this file and the corresponding Markdown file.

## Key elements

- **`withMermaid(defineConfig(...))`** — Wraps the standard VitePress config with the Mermaid plugin, enabling `mermaid` code blocks in any doc page.
- **`title` / `description`** — Site identity: "Boilerplate Vue Frontend" with an ADHD-friendly docs tagline.
- **`themeConfig.search`** — Enables local (client-side) full-text search.
- **`themeConfig.nav`** — Top-level navigation: Home, Getting Started, Theory, Modules, Tools, API, Files.
- **`themeConfig.sidebar`** — Per-section sidebar trees for `/theory/`, `/modules/`, `/tools/`, `/reference/`, and `/api/`. Organized into collapsible groups (core, supporting, generic under Modules; Setup, Framework, Observability, Testing & Mocking under Tools).
- **`themeConfig.socialLinks`** — Single GitHub link to `Guebbit/boilerplate-vue-frontend`.
- **`mermaid`** — Theme `neutral`, `useMaxWidth`, `htmlLabels`, custom flowchart spacing, and a custom color palette (purple/blue/cyan accent scheme) for diagram rendering.

## Relationships

No dependency-graph neighbors were recorded for this file. It is a leaf configuration consumed only by the VitePress build toolchain (`vitepress` and `vitepress-plugin-mermaid` are the only imports).

## Notes

- The sidebar entries must match the actual `.md` file paths (minus extension) under `docs/`. A missing file produces a 404 in the built site but no build error.
- The `/modules/` sidebar has a cross-link: the `example` item points to an anchor in `/theory/modules#adding-and-deleting-a-domain` rather than a dedicated module page—intentional, as `example` is a template rather than a shipped module.
- Mermaid `themeVariables` override the `neutral` theme's default colors; the purple (`#7c3aed`), blue (`#2563eb`), and cyan (`#0891b2`) border colors are the visual signature of diagrams throughout the docs.
- The file uses `.mts` (ESM TypeScript) so it can use `import` syntax without a `type: "module"` flag in the nearest `package.json`.
