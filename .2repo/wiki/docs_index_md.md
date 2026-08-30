# docs/index.md

## Purpose

This is the VitePress home page (`layout: home`) for the boilerplate's docs site. It orients a reader in under a minute: what the repo is, how the five docs sections (Theory, Modules, Tools, API, Files) divide the work, and where to start depending on the question you're trying to answer.

## Key elements

- **YAML frontmatter** – Sets `layout: home`, the hero block (name, tagline, three CTA buttons), and five `features` cards describing the boilerplate's shape, deletable domains, visible layers, wired-in tooling, and contract-first workflow.
- **"What this docs site is for"** – One-paragraph positioning: short, visual, practical; the repo is a blueprint, not a product.
- **"Family map" (Mermaid flowchart)** – Shows `vue-spa` (this repo) among sibling boilerplates (`vue-spa-skeleton`, `vue-spa-vuetify`, `vue-spa-quasar`, `nuxt-spa`) and links out to the four doc sections.
- **"Read this repo as"** – Six-bullet cheat-sheet mapping concepts (SPA, API client, Realtime, State, Observability, Dev backend, Contracts, Shape) to their doc pages.
- **"Five sections, five jobs"** – Brief one-liner per section with a link into each area's index.
- **"Quick visual of the current repo" (Mermaid flowchart)** – End-to-end data flow: `openapi.yaml` / `asyncapi.yaml` → generated client & Zod schemas → Pinia stores → Views / Router / I18n → SSE/WS clients → observability store.
- **"Good starting points"** – Five bullet links routing readers to the right entry page by question type.

## Relationships

- **docs/theory/index.md** – Linked as the "Theory Overview" starting point and as the `Read Theory` hero CTA target (`/theory/`).
- **docs/theory/layers.md** – Linked twice: in "Read this repo as" (under *Shape*) and in "Good starting points."
- **docs/theory/domain-layer.md / request-flow.md** – Part of the Theory section this page summarizes; reached via the `/theory/` index.
- **docs/api/openapi-workflow.md** – Linked in "Read this repo as" (API client, Contracts) and "Good starting points" (payload changes).
- **docs/api/asyncapi-workflow.md** – Linked in "Read this repo as" (Realtime, Contracts) and shown as the source of `asyncapi.generated.ts` in the architecture Mermaid diagram.
- **docs/modules/index.md** – Linked as "the whole map" in the Modules section; described as fourteen domains grouped by subdomain.
- **docs/modules/inventory.md / locales.md** – Individual domain pages under the Modules section this page introduces.
- **docs/tools/docker-and-podman.md / environment.md / i18n.md / mutation-testing.md** – Dependency-focused pages under the Tools section this page summarizes.
- **README.md** – Sibling top-level doc; this page is the in-docs navigation hub that the README points to.

## Notes

- The frontmatter `features` array is consumed by VitePress's `layout: home` component; editing it changes the rendered cards without touching the Markdown body.
- Both Mermaid diagrams use `%%{init: ...}%%` to tune `nodeSpacing` and `rankSpacing` for readability; removing those lines will make the diagrams render but with tighter spacing.
- The "Five sections" list includes a **Files** section (`./reference/`) that has no corresponding entry in the frontmatter `actions` array, so it is reachable only from the body text.
- The page intentionally links to pages *outside* its listed graph neighbors (e.g., `./tools/state-and-routing.md`, `./tools/observability.md`, `./tools/demo-profile.md`, `./reference/`); these are additional doc pages that exist in the repo but were not part of the immediate dependency slice provided here.
