# docs/theory/architecture.md

## Purpose

Defines the high-level architectural blocks (Contract → Generated → Stores → Views, plus cross-cutting HTTP, I18N, Router, and Observability) and the ownership boundaries between them. It exists to answer "which major blocks talk to each other?" without prescribing folder paths (that role belongs to `./layers.md`).

## Key elements

- **Mermaid flowchart (`Architecture frame`)** — visual dependency map: Contract → Generated → Stores → Views, with HTTP, I18N, Router, and Observability as cross-cutting actors.
- **"What each block owns" table** — one row per block listing what it owns and what it must avoid (e.g., Views avoid data fetching; HTTP layer avoids business decisions).
- **"Design rules used here"** — SOLID, DRY, KISS, and an OpenAPI-first mandate that generated types replace hand-written duplicates.
- **"Why this matters in a boilerplate"** — rationale for clear ownership lines over component-heavy data fetching, to keep the repo copyable and swappable.
- **Cross-links** — pointers to `./layers.md`, `./request-flow.md`, `../api/openapi-workflow.md`, `../tools/runtime.md`, `../tools/state-and-routing.md`.

## Relationships

- **`src/infrastructure/http/index.ts`** — the "HTTP layer" row in the ownership table and a node in the flowchart; this doc defines its contract (axios instance, interceptors, `IResponseReject` shaping) and its prohibition on business logic.
- **`src/infrastructure/stores/observability.ts`** — named as the single Observability store (Grafana Faro + Umami); the doc mandates all vendor calls route through it.
- **`src/modules/*/store.ts`** — the "Pinia stores" block; the doc assigns them data fetching, caching, and reactive state, and forbids direct DOM manipulation.
- **`src/app/router/`** — the Vue Router block; the doc scopes it to navigation, route guards, and locale injection, excluding deep business decisions.
- **`src/locales/`** — the Vue I18n block; paired with Router in the "nav" class of the flowchart and the ownership table.

## Notes

- This page intentionally does **not** list folder paths or import order; that is the job of `./layers.md`. Mixing the two would create duplication.
- The "Avoids" column in the ownership table is as normative as the "Owns" column — violations of either side are treated as architecture breaches.
- The flowchart is a *logical* dependency map, not a runtime call graph; arrows represent "provides types/instances to" rather than "calls."
