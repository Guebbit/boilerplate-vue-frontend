# docs/tools/index.md

## Purpose

Landing page for the Tools documentation section. Provides a visual overview of all third-party and framework dependencies, then routes readers to the detailed sub-page for each tool. It exists so a contributor can pick the right sub-page by intent without reading every page.

## Key elements

- **Exclusion note** — OpenAPI-specific tooling (Orval, Spectral, generated client) is deliberately excluded; it lives under `docs/api/`.
- **Tool map (Mermaid flowchart)** — Four color-coded subgraphs: *Core stack* (Runtime, Security, State & Routing), *API & Contract* (Orval, Axios, Zod, Response validation), *Observability* (Faro, Umami), *Testing & Docs* (Vitest, Cypress, Realtime, VitePress). Purely illustrative; no executable logic.
- **Read-by-intent table** — 13 rows mapping a *Group* (Overview / Setup / Framework / Observability / Testing / API) to a relative Markdown link and a one-line summary. This is the primary navigation mechanism.

## Relationships

This page is a pure index: every graph neighbor is a **link target** in the "Read by intent" table.

- `tools-explained.md` — linked as the "Overview" row (plain-English definitions of every tool).
- `runtime.md`, `security.md`, `package-dependencies.md`, `package-scripts.md`, `docker-and-podman.md` — linked under "Setup".
- `state-and-routing.md`, `realtime.md` — linked under "Framework".
- `observability.md`, `umami.md` — linked under "Observability".
- `testing-and-docs.md`, `demo-profile.md` — linked under "Testing".
- `docs/api/index.md` (outside this file's directory) — linked under "API".

No neighbor imports or references this page; the dependency is one-directional (index → leaf).

## Notes

- The Mermaid diagram uses `%%{init:…}%%` styling and `classDef` colors; it renders in Markdown viewers that support Mermaid but is **not** part of any build step.
- The "Validate" node in the API subgraph references "every profile but Vitest," a domain-specific qualifier that only makes sense once `demo-profile.md` has been read.
- All links are relative (`./…` or `../api/`), so the page assumes it sits at `docs/tools/index.md` in the repo.
