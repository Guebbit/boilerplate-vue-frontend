# docs/modules/index.md

## Purpose

Landing page for the **Modules** section of the docs site. It defines the vertical (per-domain) cut through the codebase, provides a module dependency map, explains the diagram conventions shared by every module page, and lists all 14 modules with their subdomain, store, screen count, and dependency edges. It also documents the client↔backend pairing for every module.

## Key elements

- **"Which section answers which question" table** — routes readers from a question type (theory, domain, mechanism, API, filename) to the correct docs section.
- **Division rule** — horizontal pages own a *mechanism*; module pages own a *decision*. The "delete `src/modules/cart/`" test keeps the boundary honest.
- **Mermaid flowchart** — all 14 modules in three subgraphs (`core`, `supporting`, `generic`) with typed edges (`-->` conformist, `==>` customer-supplier, `-.->` published-language).
- **Diagram legend** — node fill = business subdomain; arrow style = relationship type. Stated to be the *only* convention used across `/modules/`.
- **Module summary table** — one row per module: subdomain, screens, store name, API-call count, dependency count.
- **Backend pairing table** — maps each client module to its `boilerplate-node-backend` counterpart, calling out the three asymmetric cases (`admin`, `realtime`, `demo`).
- **Cross-cutting test reference** — `tests/cross-cutting/backend-pairing.spec.ts` enforces the pairing table in code.

## Relationships

- **`docs/index.md`** — top-level doc index; links into this page as the "Modules" section entry point.
- **`docs/modules/inventory.md`** — one of the 14 module detail pages linked from the summary table and the Mermaid diagram; inherits the diagram conventions defined here.

## Notes

- The page is **hand-maintained**: adding a screen or store to a module requires a corresponding edit here. The pairing table is *not* auto-checked against the spec test; keeping them in step is a review responsibility.
- `delivery` and `payments` have **zero screens** — they expose only a mountable component. `admin` has **no store**. These exceptions are called out explicitly.
- The `core` label marks where client-side rules are load-bearing, **not** where business logic lives; all pricing, eligibility, and permission logic is server-side.
- The `account → users` edge is `published-language` (shared validation vocabulary), not `shared-kernel`, because the server remains the single writer of the User record.
