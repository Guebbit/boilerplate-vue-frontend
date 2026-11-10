---
source: docs/.vitepress/config.mts
sha256: b5a95679421fccf52958fb0933ca30907205db0b8d0828590c53545cf3ef2881
signature: b5a95679421fccf52958fb0933ca30907205db0b8d0828590c53545cf3ef2881
generated_at: 2026-11-10T02:15:57.807243+00:00
model: ollama:qwen3.8:27b
---

# docs/.vitepress/config.mts

## Purpose

VitePress site configuration that defines the documentation site's metadata, navigation, sidebar structure, Mermaid rendering options, and social links for the Boilerplate Vue Frontend docs.

## Key elements

- **`defineConfig` / `withMermaid`** — The exported default wraps a standard VitePress config with the Mermaid plugin so `.mermaid` code blocks render as diagrams.
- **`title` / `description`** — Sets the site title to "Boilerplate Vue Frontend" and the meta description to "ADHD-friendly docs for the Vue 3 + Pinia + Vue Router SPA boilerplate".
- **`themeConfig.search`** — Enables VitePress local (client-side) search; no external provider.
- **`themeConfig.nav`** — Top-level navigation bar with seven entries: Home, Getting Started, Theory, Modules, Tools, API, Files.
- **`themeConfig.sidebar`** — A large per-section sidebar map. Sections and their groupings:
  - `/theory/` — 16 items covering architecture, DDD, request flow, design system, security, roadmap, etc.
  - `/modules/` — Organised into **core** (cart, orders, products), **supporting** (delivery, inventory, notifications, payments, returns, shop-tasks, stats, webhooks, wishlist), and **generic** (account, api-keys, example, tasks, locales, observability, users). Some entries have nested sub-items (e.g. cart → checkout flow, locales → runtime overrides, observability → dashboard).
  - `/tools/` — Groups: Setup, Framework, Observability, Interface, Testing & Mocking (16 testing items).
  - `/reference/` — File glossary grouped by repository area (root, src-app, infrastructure, modules, UI, contracts, scripts, tests, ops).
  - `/api/` — Overview, Endpoints, Observability Endpoints, OpenAPI & AsyncAPI workflows.
- **`themeConfig.socialLinks`** — Single GitHub link to `Guebbit/boilerplate-vue-frontend`.
- **`mermaid`** — Sets theme to `neutral`, enables `useMaxWidth` and `htmlLabels`, and tunes flowchart spacing (`nodeSpacing: 45`, `rankSpacing: 70`, `padding: 15`). The config continues (truncated) with `themeVariables`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The sidebar is hand-maintained; adding a new docs page without a matching sidebar entry will leave it unreachable from the nav.
- The "example" entry under `/modules/` generic points to an anchor on the Theory modules page (`/theory/modules#the-module-template`) rather than its own route — it's a cross-reference, not a standalone page.
- Mermaid config uses `htmlLabels: true`, which means rendered diagrams include HTML in node labels; be aware of CSP implications if deploying behind a strict CSP.
- The file is a `.mts` (TypeScript) module but contains no type annotations — it relies on VitePress's inferred types.
