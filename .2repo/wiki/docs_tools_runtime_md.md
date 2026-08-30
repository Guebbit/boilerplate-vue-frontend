# docs/tools/runtime.md

## Purpose

Reference page documenting the project's runtime toolchain (frameworks, build tools, HTTP client) and the conventions for how they interact. It exists so contributors and AI assistants can orient themselves on *what* runs the app and *where* each piece lives without scanning the repo.

## Key elements

- **Runtime tools table** — maps each dependency (Vue 3, TypeScript, Node 22+, Vite, `@vitejs/plugin-vue`, `vue-tsc`, Sass, Axios) to its role in the repo.
- **Mermaid flowchart** — visual pipeline from Vite → SFC transform → Components/Pinia → Axios → generated API client.
- **"How to think about runtime" section** — four conventions: keep `vite.config.ts` minimal; Composition API only; Axios configured once; `vue-tsc` gates CI.
- **Path aliases table** — `@/` → `src/`, `@api` → generated REST client, `@api/schemas` → Zod schemas.
- **Related pages links** — cross-references to state/routing, security, API, and realtime docs.

## Relationships

- **`vite.config.ts`** — the Vite configuration this page describes; dev server on `:8080`, production via `npm run build`.
- **`src/infrastructure/http/index.ts`** — the single Axios configuration point (interceptors) used by the generated client.
- **`contracts/rest/index.ts`** — the generated REST client that Axios talks to; aliased as `@api`.
- **`contracts/rest/schemas.zod.ts`** — Zod validation schemas for the REST contract; aliased as `@api/schemas`.
- **`package.json`** — defines the `npm run build` script that invokes Vite + `vue-tsc`; also declares tooling (Vitest, Orval, etc.).
- **`sass` (sass-embedded)** — the SCSS compiler for `src/styles/` global styles and `@guebbit/css-toolkit` tokens.
- **`docs/api/asyncapi-workflow.md`** — linked via the "API overview" relative path (`../api/`) for deeper API documentation.
- **`docs/index.md`** — parent index; this page is a child of the docs structure.
- **`vue3`** — the reactive framework powering all components/views in `src/`.

## Notes

- The page is purely descriptive/reference; it does not configure or execute anything itself.
- Conventions stated here (Composition API only, single Axios setup, minimal `vite.config.ts`) are enforced in CI via `vue-tsc` and code review rather than by this doc.
- The `@api` and `@api/schemas` aliases are the canonical way to import contract code in application code.
