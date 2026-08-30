# docs/theory/index.md

## Purpose

Entry-point and glossary for the **Theory** documentation section. It defines the two load-bearing terms used across every sibling page ("domain" and "barrel"), summarizes the codebase's architectural stance in one flowchart, lists the main strategies already baked into the code, and provides a topic-to-file navigation table so a reader (human or AI) can jump straight to the page that answers their question.

## Key elements

- **"Theory in one screen" flowchart** — Mermaid diagram showing the conceptual chain: Contract-first → Architecture → Layers → Request flow, with Auth+Guards and Grafana Faro/Umami as side branches.
- **Domain definition** — "One domain = one folder under `src/modules/`." Includes a nested diagram separating the *domain* (whole business area) from the inner `domain/` folder (pure, framework-free rules).
- **Four-senses table for "domain"** — Distinguishes: a domain (folder), the `domain/` sub-folder, a domain store (Pinia), and the DDD "domain" concept. Explicitly states the term never means a DNS name.
- **Barrel definition** — `index.ts` as a re-export-only boundary file; lint enforces that siblings import through it. A module with no inbound imports omits the barrel entirely (e.g. `account`).
- **Main strategies list** — Contract-first (OpenAPI → types/axios/Zod), stores own data, single observability store, demo backend via paired repo, promise-chaining style, boilerplate-over-product examples.
- **"Where each topic lives" table** — Maps 10 common needs to their target pages (reading-path, architecture, layers, modules, module-lifecycle, strategic-ddd, request-flow, sitemap, tools, api).

## Relationships

- **docs/index.md** — Upstream: the top-level documentation index links to this file as the "Theory" section root.
- **docs/theory/domain-layer.md** — Referenced in the four-senses table as the destination for the DDD "domain" sense. This page defers the full domain-modelling discussion there.
- **docs/theory/layers.md** — Referenced in the navigation table as the "folder-by-folder explanation" page. This page defines the *concept* of layers; `layers.md` covers the concrete folder structure.

## Notes

- The page is intentionally **concept-level**, not implementation-level. It defines vocabulary and points elsewhere for detail; it contains no code samples, no API specs, and no product-specific names.
- The `domain/` sub-folder is described as **"thin by design"** on a frontend — prices, totals, and eligibility are owned by the API. Most modules have no entries there.
- The barrel (`index.ts`) is a **lint-enforced boundary**: direct imports into a sibling's internal files (store, views, domain/) are blocked. This is the mechanism that makes "one domain = one folder" a hard rule rather than a convention.
- Several files linked in the navigation table (architecture.md, modules.md, request-flow.md, sitemap.md, etc.) are **not** part of the immediate graph-neighbor set but are expected to exist as siblings under `docs/theory/`.
