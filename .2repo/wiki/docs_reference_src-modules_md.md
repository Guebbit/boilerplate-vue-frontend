# docs/reference/src-modules.md

## Purpose

Reference page that catalogs the file **shapes** used by every domain under `src/modules/` (14 domains, ~12 shared shapes). It explains each shape once so readers don't re-read the same structure per module, and it points to per-domain pages for the domain-specific answers.

## Key elements

- **Core shape table** — the six files every module must have: `module.ts` (manifest, sole entry point loaded by the app), `routes.ts`, `views/*.vue`, `store.ts` (Pinia store, only tier calling the generated API client), `response-schemas.ts` (Zod response validation), `locales/*.json`.
- **Optional shape table** — files present only when a domain needs them: `index.ts` (public barrel; importing internals is a lint error), `components/*.vue`, `composables/*.ts`, `domain/*.ts` (pure rules, no store/HTTP/component), `schemas.ts` (request/form validation), `guards.ts`, `types.ts`, `dictionaries.ts`.
- **One-off table** — shapes unique to a single module: `demo/provided.ts` (typed `InjectionKey`), `realtime/store.ts` (SSE subscription), `realtime/use-realtime-observability.ts`.
- **Mermaid flowchart** — visual of the intra-module data flow from `module.ts` through routes → views → store → schemas/domain.
- **"Which module carries which" pointer** — defers the per-domain matrix to `docs/modules/index.md`; noted as hand-maintained.

## Relationships

- **`src/modules/*/module.ts`** — the declaration file this page describes as the manifest; the single entry point the application loads.
- **`src/modules/*/routes.ts`** — described as the module's URL surface; linked to `../tools/state-and-routing.md` and `../theory/sitemap.md`.
- **`src/modules/*/store.ts`** — described as the only tier that talks to the generated API client; the bridge between views and `response-schemas.ts` / `domain/`.
- **`src/modules/*/response-schemas.ts`** — the module's half of the response-schema map; validated by the store, cross-referenced with `./src-infrastructure.md` and `../api/openapi-workflow.md`.
- **`src/modules/*/domain/`** — pure rules over plain data; a rule returns a verdict, the caller renders. Linked to `../theory/domain-layer.md`.
- **`docs/reference/src-ui.md`** — the page this file points to when a component renders a shape rather than a domain-specific thing (i.e. it belongs in the UI kit, not in `components/`).
- **`docs/reference/tests.md`** — where each module's `tests/` subfolder is catalogued; this page explicitly delegates test structure to that page.
- **`tests/cross-cutting/module-file-shapes.spec.ts`** — enforces the same catalogue in code; fails on any file in a module folder that matches no listed shape. Adding a new shape requires a line here and a line there.

## Notes

- A module with none of the optional shapes is described as "small," not incomplete — absence is valid.
- `index.ts` is the module's **only** published import surface; reaching past it into internals is a lint error.
- The "Which module carries which" section is hand-written and lives on the per-domain pages under `docs/modules/`, not here, because it is a per-domain answer rather than a file-shape answer.
- `response-schemas.ts` (responses) and `schemas.ts` (requests) are distinct files with distinct purposes; confusing them is a common trap.
